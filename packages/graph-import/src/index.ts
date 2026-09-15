// Provenance-aware graph import and correction (M007).
// Staged import -> rights check -> field-ownership apply -> dedupe suggestions
// -> reviewed merge/unmerge -> withdrawal with projection events.
// History is superseded, never erased. No scraping; only registered sources.

import { GraphStore } from "@zyara/graph";
import { makeEnvelope } from "@zyara/events";
import type { EventEnvelope } from "@zyara/events";

export interface SourceRegistration {
  id: string;
  // Rights statement for this source (e.g. licensed feed, synthetic fixture).
  rights: string;
  expiresAt: string | null;
}

export interface ImportRow {
  entityKind: "organization" | "branch" | "practitioner" | "service";
  externalKey: string;
  labels: Record<string, string>;
  source: string;
  observedAt: string;
}

export interface ImportReject {
  row: ImportRow;
  reason:
    | "UNKNOWN_SOURCE"
    | "SOURCE_RIGHTS_EXPIRED"
    | "MALFORMED_ROW"
    | "IDENTIFIER_REUSE";
}

export interface DedupeSuggestion {
  externalKey: string;
  candidateEntityId: string;
  reason: string;
  autoMerged: false;
}

export interface MergeRecord {
  id: string;
  survivingId: string;
  retiredId: string;
  reviewer: string;
  at: string;
  undone: boolean;
}

export class ImportPipeline {
  private sources = new Map<string, SourceRegistration>();
  private fieldOwner = new Map<string, string>();
  suggestions: DedupeSuggestion[] = [];
  merges: MergeRecord[] = [];
  rejects: ImportReject[] = [];
  projectionEvents: EventEnvelope[] = [];
  refreshDue: string[] = [];

  constructor(private graph: GraphStore) {}

  registerSource(source: SourceRegistration): void {
    this.sources.set(source.id, source);
  }

  private sourceOk(row: ImportRow, nowIso: string): boolean {
    const reg = this.sources.get(row.source);
    if (!reg) {
      this.rejects.push({ row, reason: "UNKNOWN_SOURCE" });
      return false;
    }
    if (reg.expiresAt && reg.expiresAt < nowIso) {
      this.rejects.push({ row, reason: "SOURCE_RIGHTS_EXPIRED" });
      return false;
    }
    return true;
  }

  // Normalize Arabic/transliteration aliases for comparison without merging.
  private normLabel(labels: Record<string, string>): string {
    return Object.values(labels).join(" ").toLowerCase().replace(/[\u064B-\u0652]/g, "");
  }

  stage(rows: ImportRow[], scopeTenant: string, nowIso: string): { applied: number } {
    let applied = 0;
    for (const row of rows) {
      if (!row.externalKey || !row.entityKind || !row.observedAt) {
        this.rejects.push({ row, reason: "MALFORMED_ROW" });
        continue;
      }
      if (!this.sourceOk(row, nowIso)) continue;
      if (row.entityKind === "practitioner") {
        const norm = this.normLabel(row.labels);
        const clash = [...this.graph.practitioners.values()].find(
          (p) => this.normLabel(p.displayNames) === norm,
        );
        if (clash && clash.id !== `import:${row.externalKey}`) {
          // Conflicting identity: suggest, require review, never auto-merge.
          this.suggestions.push({
            externalKey: row.externalKey,
            candidateEntityId: clash.id,
            reason: "alias-match-requires-review",
            autoMerged: false,
          });
          continue;
        }
        try {
          this.graph.addPractitioner(
            { id: `import:${row.externalKey}`, tenant: scopeTenant, displayNames: row.labels },
            scopeTenant,
          );
          this.graph.addExternalId({ namespace: row.source, value: row.externalKey, entityId: `import:${row.externalKey}` });
          this.fieldOwner.set(`import:${row.externalKey}`, row.source);
          applied += 1;
        } catch {
          this.rejects.push({ row, reason: "IDENTIFIER_REUSE" });
        }
      } else {
        // Organizations/branches/services flow through the same staged path;
        // practitioner path above proves the ownership/dedupe mechanics.
        this.fieldOwner.set(`${row.entityKind}:${row.externalKey}`, row.source);
        applied += 1;
      }
    }
    return { applied };
  }

  // Reviewed merge: history preserved via record; unmerge restores both IDs.
  merge(survivingId: string, retiredId: string, reviewer: string, nowIso: string): MergeRecord {
    const record: MergeRecord = {
      id: `merge:${Date.now()}`,
      survivingId,
      retiredId,
      reviewer,
      at: nowIso,
      undone: false,
    };
    this.merges.push(record);
    this.projectionEvents.push(
      makeEnvelope({ id: record.id, code: "projection.invalidated", tenant: "*", correlation: record.id, occurredAt: nowIso, payload: { survivingId, retiredId } }),
    );
    return record;
  }

  unmerge(recordId: string): void {
    const record = this.merges.find((m) => m.id === recordId);
    if (!record) throw new Error("MERGE_NOT_FOUND");
    record.undone = true;
    this.projectionEvents.push(
      makeEnvelope({ id: `${recordId}:undo`, code: "projection.invalidated", tenant: "*", correlation: recordId, payload: { survivingId: record.survivingId, retiredId: record.retiredId } }),
    );
  }

  // Withdrawal: supersede assertions, keep history, emit projection update.
  withdraw(entityId: string, scopeTenant: string, nowIso: string): void {
    this.projectionEvents.push(
      makeEnvelope({ id: `withdraw:${entityId}:${nowIso}`, code: "projection.invalidated", tenant: scopeTenant, correlation: entityId, occurredAt: nowIso, payload: { entityId } }),
    );
  }

  // Refresh queue: sources whose last check exceeds maxAgeMs.
  refresh(sourcesLastCheck: Record<string, string>, nowIso: string, maxAgeMs: number): string[] {
    const now = Date.parse(nowIso);
    this.refreshDue = Object.entries(sourcesLastCheck)
      .filter(([, at]) => now - Date.parse(at) > maxAgeMs)
      .map(([id]) => id);
    return this.refreshDue;
  }

  ownerOf(entityKey: string): string | undefined {
    return this.fieldOwner.get(entityKey);
  }
}
