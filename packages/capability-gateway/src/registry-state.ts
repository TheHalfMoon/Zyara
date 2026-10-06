// Zyara AI Operating Fabric AIF-01B: in-process registry, grant and approval-claim state.
//
// It mirrors migration 046: definitions are immutable once admitted, status changes,
// grants, revocations and approval claims are append-only, and current state is derived by
// replaying them. The real-PostgreSQL smoke proves the same rules against the database;
// this class lets the resolver be qualified without one.

import { APPROVAL_PARAMETERS_DIGEST_PATTERN } from "@zyara/collaboration";

import type { CapabilityGrantee } from "./contract.js";
import {
  CAPABILITY_DIGEST_PATTERN,
  CAPABILITY_ID_PATTERN,
  CAPABILITY_VERSION_PATTERN,
  CapabilityContractError,
  isOpaqueId,
  isOpaqueToken,
  validateGrant,
  type AdmittedCapability,
} from "./contract.js";
import { RESOLUTION_DECISIONS, verifyReceiptDigest } from "./resolver.js";
import type {
  ApprovalClaimant,
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

const REASON_CODE = /^[A-Z][A-Z0-9_]{1,95}$/;

// The same rules the 046 receipt CHECKs apply: closed decision, digest shapes, opaque tokens
// and server time; a hand-made receipt carrying free text is refused before it is stored.
function assertReceiptShape(receipt: ResolutionReceipt): void {
  const bad = (message: string): never => {
    throw new CapabilityContractError("CAPABILITY_RECEIPT_INVALID", message);
  };
  if (!(RESOLUTION_DECISIONS as readonly string[]).includes(receipt.decision)) bad("unknown decision");
  if (!/^res_[0-9a-f]{64}$/.test(receipt.receiptDigest)) bad("receipt digest shape");
  if (!Array.isArray(receipt.reasons) || receipt.reasons.length === 0 || !receipt.reasons.every((code) => REASON_CODE.test(code))) {
    bad("reason codes must be closed codes");
  }
  if (!isOpaqueId(receipt.tenantId)) bad("tenant");
  if (!(["human", "agent", "workflow"] as const).includes(receipt.actorKind)) bad("actor kind");
  for (const value of [receipt.branchId, receipt.grantId]) if (value !== null && !isOpaqueId(value)) bad("id shape");
  for (const value of [receipt.actorRef, receipt.correlationId, receipt.idempotencyKey, receipt.approvalRequestId]) {
    if (value !== null && !isOpaqueToken(value)) bad("token shape");
  }
  if (receipt.capabilityId !== null && !CAPABILITY_ID_PATTERN.test(receipt.capabilityId)) bad("capability id");
  if (receipt.version !== null && !CAPABILITY_VERSION_PATTERN.test(receipt.version)) bad("version");
  if (receipt.definitionDigest !== null && !CAPABILITY_DIGEST_PATTERN.test(receipt.definitionDigest)) bad("definition digest");
  if (receipt.parametersDigest !== null && !APPROVAL_PARAMETERS_DIGEST_PATTERN.test(receipt.parametersDigest)) bad("parameters digest");
  if (receipt.decidedAt === null && receipt.decision !== "UNDECIDABLE") bad("only UNDECIDABLE may lack trusted time");
  if (receipt.decision === "ALLOW" && (receipt.grantId === null || receipt.validUntil === null)) bad("ALLOW names its grant and validity");
}

export class CapabilityRegistryState {
  readonly #definitions = new Map<string, { admitted: AdmittedCapability; binding: ProviderAdapterBinding | null }>();
  readonly #statusEvents = new Map<string, StatusEvent[]>();
  readonly #grants = new Map<string, CapabilityGrantRecord>();
  readonly #revocations: Revocation[] = [];
  readonly #claims = new Map<string, ApprovalClaimant>();
  readonly #receipts: ResolutionReceipt[] = [];
  readonly #now: () => string;

  // The clock refuses to record an ALLOW whose validity has already passed.
  constructor(options: { now?: () => string } = {}) {
    this.#now = options.now ?? (() => new Date().toISOString());
  }

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

  // First claim wins; the same invocation (same actor and idempotency key) may claim again.
  // Private: the only way to claim is to record an approval-backed ALLOW receipt.
  #claimApproval(tenantId: string, approvalRequestId: string, claimant: ApprovalClaimant): ApprovalClaimResult {
    const key = `${tenantId}:${approvalRequestId}`;
    const holder = this.#claims.get(key);
    if (holder === undefined) {
      this.#claims.set(key, Object.freeze({ ...claimant }));
      return "CLAIMED";
    }
    const same =
      holder.actorKind === claimant.actorKind && holder.actorRef === claimant.actorRef && holder.idempotencyKey === claimant.idempotencyKey;
    return same ? "SAME_INVOCATION" : "CLAIMED_BY_OTHER";
  }

  // For an ALLOW that used an approval, claims the approval first and appends the receipt
  // only when the claim is this invocation's (as the 046 FK from receipt to claim requires).
  // A lost race appends nothing: the caller re-resolves, which now yields
  // DENY CAPABILITY_APPROVAL_CONSUMED, and records that receipt instead.
  async record(receipt: ResolutionReceipt): Promise<ApprovalClaimResult | "RECORDED"> {
    assertReceiptShape(receipt);
    if (!(await verifyReceiptDigest(receipt))) {
      throw new CapabilityContractError("CAPABILITY_RECEIPT_INVALID", "receipt content does not match its digest");
    }
    // Written as "not after" so an unparseable time fails closed.
    if (receipt.decision === "ALLOW" && !(Date.parse(receipt.validUntil ?? "") > Date.parse(this.#now()))) {
      throw new CapabilityContractError("CAPABILITY_RECEIPT_INVALID", "an expired ALLOW cannot be recorded; re-resolve");
    }
    if (receipt.decision === "ALLOW" && receipt.approvalRequestId !== null) {
      if (receipt.idempotencyKey === null || receipt.actorRef === null) fail("an approval-backed ALLOW must name its invocation");
      const claim = this.#claimApproval(receipt.tenantId, receipt.approvalRequestId, {
        actorKind: receipt.actorKind,
        actorRef: receipt.actorRef,
        idempotencyKey: receipt.idempotencyKey,
      });
      if (claim === "CLAIMED_BY_OTHER") return claim;
      this.#receipts.push(receipt);
      return claim;
    }
    this.#receipts.push(receipt);
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
