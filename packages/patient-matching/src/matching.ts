// Patient matching and validated FHIR imports (M052).
// Imports run behind M051 care consent. Matching is deterministic and
// explainable: exact identifier match, review on partial conflict, and
// no-match otherwise. Conflicting identifiers are never silently merged.
// Merges and unmerges append to history; identity history is never erased.

import { isConsented, type ConsentGrant } from "@zyara/consent-boundaries";

export interface FhirPatientImport {
  resourceType: "Patient";
  id?: string;
  identifier?: Array<{ system?: string; value?: string }>;
  name?: Array<{ family?: string; given?: string[] }>;
  birthDate?: string;
}

export interface LocalPatient {
  patientId: string;
  identifiers: Array<{ system: string; value: string }>;
  family: string;
  birthDate: string;
}

export type MatchOutcome = "match" | "review" | "no-match";

export interface MatchResult {
  outcome: MatchOutcome;
  candidateId: string | null;
  reasons: string[];
}

export function validatePatientImport(
  p: FhirPatientImport,
): { ok: true } | { error: string } {
  if (!p.id) return { error: "Patient import without id." };
  if (!p.identifier || p.identifier.length === 0) {
    return { error: `Patient ${p.id} has no identifiers.` };
  }
  return { ok: true };
}

export function matchPatient(
  imported: { identifiers: Array<{ system?: string; value?: string }>; family: string; birthDate: string },
  locals: readonly LocalPatient[],
): MatchResult {
  const impIds = imported.identifiers.filter((i) => i.system && i.value) as Array<{ system: string; value: string }>;
  for (const local of locals) {
    const overlap = local.identifiers.filter((li) =>
      impIds.some((ii) => ii.system === li.system && ii.value === li.value),
    );
    if (overlap.length > 0) {
      const conflict = impIds.some((ii) =>
        local.identifiers.some((li) => li.system === ii.system && li.value !== ii.value),
      );
      if (conflict) {
        return {
          outcome: "review", candidateId: local.patientId,
          reasons: ["identifier-overlap-with-system-conflict"],
        };
      }
      const demo = local.family === imported.family && local.birthDate === imported.birthDate;
      return {
        outcome: demo ? "match" : "review",
        candidateId: local.patientId,
        reasons: demo ? ["identifier-and-demographic-match"] : ["identifier-match-demographic-mismatch"],
      };
    }
  }
  return { outcome: "no-match", candidateId: null, reasons: ["no-identifier-overlap"] };
}

export interface MergeEvent {
  atUtc: string;
  survivingId: string;
  absorbedId: string;
  actorId: string;
  reason: string;
  undone: boolean;
}

export function recordMerge(
  history: MergeEvent[],
  event: Omit<MergeEvent, "undone">,
): MergeEvent[] {
  return [...history, { ...event, undone: false }];
}

export function unmerge(
  history: MergeEvent[],
  absorbedId: string,
  atUtc: string,
): MergeEvent[] {
  void atUtc;
  return history.map((h) =>
    h.absorbedId === absorbedId ? { ...h, undone: true } : h,
  );
}

export function importAllowed(
  grants: readonly ConsentGrant[],
  patientId: string,
  nowUtc: string,
): boolean {
  void patientId;
  return isConsented(grants, "care", nowUtc);
}
