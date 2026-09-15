// Provider claiming and verification workflow (M008).
// Badge = a specific checked fact with evidence scope + freshness.
// States: pending/attested/checked/disputed/expired/withdrawn.
// Sales cannot override; disputes never hand control to unverified actors.
// Verification files are private; public projection carries scope + redaction.

import { makeEnvelope } from "@zyara/events";
import type { EventEnvelope } from "@zyara/events";

export type ClaimState =
  | "pending"
  | "attested"
  | "checked"
  | "disputed"
  | "expired"
  | "withdrawn";

export interface EvidenceItem {
  id: string;
  kind: "role_registration" | "facility_license" | "service_authority" | "identity";
  // Private by default: file refs never leave the reviewer queue.
  privateRef: string;
  scope: string;
  observedAt: string;
  expiresAt: string | null;
}

export interface Claim {
  id: string;
  tenant: string;
  branchId: string;
  claimantAccount: string;
  representativeRole: string;
  state: ClaimState;
  evidence: EvidenceItem[];
  reviewer: string | null;
  decidedAt: string | null;
  disputeOf: string | null;
}

export interface Badge {
  claimId: string;
  // Badge text describes the exact evidence scope, per locale.
  scopeByLocale: Record<string, string>;
  observedAt: string;
  expiresAt: string | null;
}

const TERMINAL_SUPPLY_BLOCK: ClaimState[] = ["expired", "withdrawn", "disputed"];

export class VerificationQueue {
  claims = new Map<string, Claim>();
  projectionEvents: EventEnvelope[] = [];
  reviewLatencyMs: number[] = [];

  submit(claim: Claim): void {
    if (this.claims.has(claim.id)) throw new Error("CLAIM_DUPLICATE");
    claim.state = "pending";
    this.claims.set(claim.id, claim);
  }

  attest(claimId: string, evidence: EvidenceItem[]): void {
    const claim = this.get(claimId);
    if (claim.state !== "pending") throw new Error("CLAIM_STATE");
    claim.evidence = evidence;
    claim.state = "attested";
  }

  // Only reviewer-role actors may decide. Sales/claimant cannot self-approve.
  decide(claimId: string, reviewer: string, reviewerRole: string, approve: boolean, nowIso: string): void {
    const claim = this.get(claimId);
    if (reviewerRole !== "trust_reviewer") throw new Error("REVIEWER_ROLE_REQUIRED");
    if (reviewer === claim.claimantAccount) throw new Error("NO_SELF_APPROVAL");
    claim.reviewer = reviewer;
    claim.decidedAt = nowIso;
    claim.state = approve ? "checked" : "withdrawn";
    this.projectionEvents.push(
      makeEnvelope({ id: `verify:${claimId}:${nowIso}`, code: "projection.invalidated", tenant: claim.tenant, correlation: claimId, occurredAt: nowIso, payload: { claimId, state: claim.state } }),
    );
  }

  dispute(claimId: string, disputant: string, nowIso: string): Claim {
    const claim = this.get(claimId);
    // Dispute opens a NEW claim under review; control stays with the current
    // holder until a reviewer decides. Never hands control to the disputant.
    const counter: Claim = {
      id: `${claimId}:dispute:${Date.parse(nowIso)}`,
      tenant: claim.tenant,
      branchId: claim.branchId,
      claimantAccount: disputant,
      representativeRole: "disputant",
      state: "disputed",
      evidence: [],
      reviewer: null,
      decidedAt: null,
      disputeOf: claimId,
    };
    claim.state = "disputed";
    this.claims.set(counter.id, counter);
    return counter;
  }

  recheck(nowIso: string): string[] {
    // Recheck cadence: expire checked claims whose evidence lapsed.
    const expired: string[] = [];
    for (const claim of this.claims.values()) {
      if (claim.state !== "checked") continue;
      const lapsed = claim.evidence.some((e) => e.expiresAt && e.expiresAt < nowIso);
      if (lapsed) {
        claim.state = "expired";
        expired.push(claim.id);
        this.projectionEvents.push(
          makeEnvelope({ id: `verify:${claim.id}:${nowIso}:expired`, code: "projection.invalidated", tenant: claim.tenant, correlation: claim.id, occurredAt: nowIso, payload: { claimId: claim.id, state: "expired" } }),
        );
      }
    }
    return expired;
  }

  badgeFor(claimId: string): Badge | null {
    const claim = this.get(claimId);
    if (claim.state !== "checked") return null;
    const scope = claim.evidence.map((e) => e.scope).join("; ");
    return {
      claimId,
      scopeByLocale: {
        ar: `تم التحقق: ${scope}`,
        en: `Verified: ${scope}`,
        fr: `Vérifié : ${scope}`,
        de: `Verifiziert: ${scope}`,
        es: `Verificado: ${scope}`,
      },
      observedAt: claim.decidedAt ?? "",
      expiresAt: claim.evidence.map((e) => e.expiresAt).find((x) => x) ?? null,
    };
  }

  // Supply gate for M009/M016: expired/suspended credentials block booking.
  supplyBlocked(branchId: string): boolean {
    return [...this.claims.values()].some(
      (c) => c.branchId === branchId && (TERMINAL_SUPPLY_BLOCK as string[]).includes(c.state),
    );
  }

  // Public projection: scope + freshness only; private refs never included.
  publicProjection(claimId: string): Record<string, unknown> | null {
    const badge = this.badgeFor(claimId);
    if (!badge) return null;
    return { claimId: badge.claimId, scope: badge.scopeByLocale, observedAt: badge.observedAt, expiresAt: badge.expiresAt };
  }

  private get(claimId: string): Claim {
    const claim = this.claims.get(claimId);
    if (!claim) throw new Error("CLAIM_NOT_FOUND");
    return claim;
  }
}
