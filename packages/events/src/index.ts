// Zyara durable event delivery primitives (M004).
// Versioned envelope, unit-of-work contract, idempotent scoped consumers,
// quarantine for incompatible versions. Event bodies carry IDs and codes only:
// NO patient text in generic event bodies.

export type EventCode =
  | "membership.changed"
  | "op.committed"
  | "op.conflicted"
  | "projection.invalidated";

export interface EventEnvelope {
  id: string;
  code: EventCode;
  version: 1;
  tenant: string;
  correlation: string;
  occurredAt: string;
  // Minimal payload: opaque IDs + stable codes. Never free text / PHI.
  payload: Record<string, string>;
}

export interface OutboxRecord extends EventEnvelope {
  claimedBy: string | null;
  attempts: number;
  nextAttemptAt: string;
  status: "pending" | "delivered" | "dead";
}

export interface Consumer {
  name: string;
  codes: EventCode[];
  // Tenants this consumer serves; empty = all (only for tenant-agnostic infra).
  tenants: string[];
  handle: (event: EventEnvelope) => Promise<"ack" | "retry" | "reject">;
}

// Unit of work: domain-state write + outbox append commit atomically.
// Implementations must use one DB transaction (see 004 migration + worker).
export interface UnitOfWork {
  append(event: EventEnvelope): void;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export function makeEnvelope(init: {
  id: string;
  code: EventCode;
  tenant: string;
  correlation?: string;
  occurredAt?: string;
  payload?: Record<string, string>;
}): EventEnvelope {
  for (const [, v] of Object.entries(init.payload ?? {})) {
    if (typeof v !== "string") throw new Error("EVENT_PAYLOAD_MUST_BE_STRING_IDS");
  }
  return {
    id: init.id,
    code: init.code,
    version: 1,
    tenant: init.tenant,
    correlation: init.correlation ?? init.id,
    occurredAt: init.occurredAt ?? new Date().toISOString(),
    payload: init.payload ?? {},
  };
}

// In-memory outbox for unit tests and local synthetic runs.
// Production path is the SQL outbox in db/migrations/004 (same semantics).
export class MemoryOutbox {
  private pending: OutboxRecord[] = [];
  private delivered: string[] = [];
  private dead: OutboxRecord[] = [];
  private inbox: Set<string> = new Set();
  quarantine: EventEnvelope[] = [];

  append(event: EventEnvelope): void {
    this.pending.push({
      ...event,
      claimedBy: null,
      attempts: 0,
      nextAttemptAt: event.occurredAt,
      status: "pending",
    });
  }

  pendingCount(): number {
    return this.pending.filter((r) => r.status === "pending").length;
  }

  deadCount(): number {
    return this.dead.length;
  }

  // Crash-before-commit: caller drops the outbox without commit -> nothing appended.
  // Crash-after-commit: records durable; redelivery dedupes via inbox below.

  async dispatch(consumer: Consumer, nowIso: string, maxAttempts = 5): Promise<void> {
    const due = this.pending.filter((r) => r.status === "pending" && r.nextAttemptAt <= nowIso);
    for (const rec of due) {
      // Cross-tenant routing: consumer only sees its tenants.
      if (consumer.tenants.length > 0 && !consumer.tenants.includes(rec.tenant)) continue;
      // Incompatible version -> quarantine, never poison the queue.
      if ((rec.version as number) !== 1) {
        rec.status = "dead";
        this.quarantine.push(rec);
        this.dead.push(rec);
        continue;
      }
      // Duplicate delivery -> one logical effect via inbox dedupe.
      const inboxKey = `${consumer.name}:${rec.id}`;
      if (this.inbox.has(inboxKey)) {
        rec.status = "delivered";
        continue;
      }
      if (!consumer.codes.includes(rec.code)) continue;
      const outcome = await consumer.handle(rec);
      if (outcome === "ack") {
        this.inbox.add(inboxKey);
        rec.status = "delivered";
        this.delivered.push(rec.id);
      } else if (outcome === "reject") {
        rec.status = "dead";
        this.dead.push(rec);
      } else {
        rec.attempts += 1;
        if (rec.attempts >= maxAttempts) {
          rec.status = "dead";
          this.dead.push(rec);
        } else {
          rec.nextAttemptAt = new Date(Date.parse(nowIso) + rec.attempts * 60_000).toISOString();
        }
      }
    }
    this.pending = this.pending.filter((r) => r.status === "pending");
  }

  // Worker restart: undispatched records remain pending and are rediscovered
  // by cursor (created order). Returns count still owed.
  owedCount(): number {
    return this.pending.length;
  }
}
