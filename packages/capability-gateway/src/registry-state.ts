// Zyara AI Operating Fabric AIF-01B: in-process registry, grant and approval-claim state.
//
// It mirrors migration 046: definitions are immutable once admitted, status changes,
// grants, revocations and approval claims are append-only, and current state is derived by
// replaying them. The real-PostgreSQL smoke proves the same rules against the database;
// this class lets the resolver be qualified without one.

import type { CapabilityGrantee } from "./contract.js";
import { CapabilityContractError, validateGrant, type AdmittedCapability } from "./contract.js";
import type {
  CapabilityGrantRecord,
  DefinitionStatus,
  ProviderAdapterBinding,
  RegisteredCapability,
  ResolutionReceipt,
  ResolverDependencies,
} from "./resolver.js";

// Agent and workflow grants are bounded like N5/C1 agent identities.
export const CAPABILITY_GRANT_MAX_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type ApprovalClaimResult = "CLAIMED" | "SAME_INVOCATION" | "CLAIMED_BY_OTHER";

interface StatusEvent {
  status: DefinitionStatus;
  at: string;
}

interface Revocation {
  grantId: string;
  tenantId: string;
  revokedAt: string;
}

function fail(message: string): never {
  throw new CapabilityContractError("CAPABILITY_GRANT_MISMATCH", message);
}

export class CapabilityRegistryState {
  readonly #definitions = new Map<string, { admitted: AdmittedCapability; binding: ProviderAdapterBinding | null }>();
  readonly #statusEvents = new Map<string, StatusEvent[]>();
  readonly #grants = new Map<string, CapabilityGrantRecord>();
  readonly #revocations: Revocation[] = [];
  readonly #claims = new Map<string, string>();
  readonly #receipts: ResolutionReceipt[] = [];

  admit(admitted: AdmittedCapability, binding: ProviderAdapterBinding | null = null): void {
    const key = `${admitted.definition.id}@${admitted.definition.version}`;
    if (this.#definitions.has(key)) {
      throw new CapabilityContractError("CAPABILITY_VERSION_DUPLICATE", `${key} is already admitted`);
    }
    this.#definitions.set(key, { admitted, binding: binding === null ? null : Object.freeze({ ...binding }) });
  }

  setStatus(capabilityId: string, version: string, status: DefinitionStatus, at: string): void {
    const key = `${capabilityId}@${version}`;
    if (!this.#definitions.has(key)) throw new CapabilityContractError("CAPABILITY_UNKNOWN", "unknown capability");
    const events = this.#statusEvents.get(key) ?? [];
    events.push({ status, at });
    this.#statusEvents.set(key, events);
  }

  grant(record: CapabilityGrantRecord): void {
    const entry = this.#definitions.get(`${record.capabilityId}@${record.version}`);
    if (!entry) throw new CapabilityContractError("CAPABILITY_UNKNOWN", "unknown capability");
    if (this.#grants.has(record.grantId)) fail("grant id already used");
    if (record.revokedAt !== null) fail("a grant is revoked by appending a revocation, not created revoked");
    validateGrant(entry.admitted, record);
    if (record.grantee.kind !== "human_role") {
      if (record.expiresAt === null) fail("agent and workflow grants must expire");
      const lifetime = Date.parse(record.expiresAt) - Date.parse(record.grantedAt);
      if (!(lifetime > 0 && lifetime <= CAPABILITY_GRANT_MAX_TTL_MS)) fail("grant lifetime must be positive and at most 90 days");
    }
    this.#grants.set(record.grantId, Object.freeze({ ...record, grantee: Object.freeze({ ...record.grantee }) }));
  }

  revokeGrant(grantId: string, tenantId: string, revokedAt: string): void {
    const record = this.#grants.get(grantId);
    if (!record || record.tenantId !== tenantId) fail("unknown grant");
    this.#revocations.push({ grantId, tenantId, revokedAt });
  }

  // First claim wins; the same invocation (same idempotency key) may claim again.
  claimApproval(tenantId: string, approvalRequestId: string, idempotencyKey: string): ApprovalClaimResult {
    const key = `${tenantId}:${approvalRequestId}`;
    const holder = this.#claims.get(key);
    if (holder === undefined) {
      this.#claims.set(key, idempotencyKey);
      return "CLAIMED";
    }
    return holder === idempotencyKey ? "SAME_INVOCATION" : "CLAIMED_BY_OTHER";
  }

  // Appends the receipt and, for an ALLOW that used an approval, claims that approval. A lost
  // claim race means the decision must be treated as DENY by the caller.
  record(receipt: ResolutionReceipt): ApprovalClaimResult | "RECORDED" {
    this.#receipts.push(receipt);
    if (receipt.decision === "ALLOW" && receipt.approvalRequestId !== null && receipt.idempotencyKey !== null) {
      return this.claimApproval(receipt.tenantId, receipt.approvalRequestId, receipt.idempotencyKey);
    }
    return "RECORDED";
  }

  receipts(tenantId: string): readonly ResolutionReceipt[] {
    return this.#receipts.filter((receipt) => receipt.tenantId === tenantId);
  }

  #status(key: string): DefinitionStatus {
    const events = this.#statusEvents.get(key);
    return events && events.length > 0 ? events[events.length - 1].status : "active";
  }

  // Ports for the resolver.
  registryPort(): ResolverDependencies["registry"] {
    return {
      findCapability: (capabilityId) => {
        const found: RegisteredCapability[] = [];
        for (const [key, entry] of this.#definitions) {
          if (entry.admitted.definition.id !== capabilityId) continue;
          found.push({ admitted: entry.admitted, status: this.#status(key), providerBinding: entry.binding });
        }
        return found.length === 0 ? null : found;
      },
    };
  }

  grantsPort(): ResolverDependencies["grants"] {
    return {
      grantsFor: (tenantId: string, grantee: CapabilityGrantee, capabilityId: string, version: string) =>
        [...this.#grants.values()]
          .filter(
            (record) =>
              record.tenantId === tenantId &&
              record.grantee.kind === grantee.kind &&
              record.grantee.id === grantee.id &&
              record.capabilityId === capabilityId &&
              record.version === version,
          )
          .map((record) => {
            const revocation = this.#revocations.find((item) => item.grantId === record.grantId && item.tenantId === tenantId);
            return revocation ? { ...record, revokedAt: revocation.revokedAt } : record;
          }),
    };
  }

  claimantPort(): ResolverDependencies["approvals"]["claimant"] {
    return (approvalRequestId, tenantId) => this.#claims.get(`${tenantId}:${approvalRequestId}`) ?? null;
  }
}
