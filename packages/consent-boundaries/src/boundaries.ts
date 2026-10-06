// Separate clinical consent and storage boundaries (M051).
// Consent is purpose-bound: care, recall, analytics. Analytics consent is
// never implied by care consent. Clinical records live in a separate
// store; cross-boundary reads are explicit and audited. Revocation closes
// future reads while preserving the audit trail. Marketing use of
// clinical data is always refused.

export type ConsentPurpose = "care" | "recall" | "analytics";

export interface ConsentGrant {
  patientId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  atUtc: string;
  revokedAtUtc: string | null;
}

// A full ISO-8601 date-time with seconds and an explicit zone (Z or ±hh:mm).
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

function instant(value: unknown): number {
  return typeof value === "string" && ISO_DATE_TIME.test(value) ? Date.parse(value) : Number.NaN;
}

// Instants are compared parsed, never as strings: "12:00:00Z" vs "12:00:00.500Z" or a
// "+03:00" offset would otherwise misorder grant and revocation times. Any malformed time
// (grant, revocation or now) fails closed.
export function isConsented(
  grants: readonly ConsentGrant[],
  purpose: ConsentPurpose,
  nowUtc: string,
): boolean {
  const now = instant(nowUtc);
  if (Number.isNaN(now)) return false;
  return grants.some((g) => {
    if (g.purpose !== purpose || g.granted !== true) return false;
    const at = instant(g.atUtc);
    if (Number.isNaN(at) || at > now) return false;
    if (g.revokedAtUtc === null) return true;
    const revoked = instant(g.revokedAtUtc);
    return !Number.isNaN(revoked) && revoked > now;
  });
}

export type DataClass = "clinical" | "operational";

export interface BoundaryRead {
  atUtc: string;
  actorId: string;
  patientId: string;
  fromStore: DataClass;
  purpose: ConsentPurpose;
  allowed: boolean;
  reason: string;
}

export function authorizeClinicalRead(
  grants: readonly ConsentGrant[],
  actorId: string,
  patientId: string,
  purpose: ConsentPurpose,
  nowUtc: string,
  log: BoundaryRead[],
): { allowed: boolean; entry: BoundaryRead } {
  if (purpose === "analytics" && !isConsented(grants, "analytics", nowUtc)) {
    const entry: BoundaryRead = {
      atUtc: nowUtc, actorId, patientId, fromStore: "clinical",
      purpose, allowed: false, reason: "analytics-consent-required",
    };
    log.push(entry);
    return { allowed: false, entry };
  }
  if (!isConsented(grants, purpose, nowUtc)) {
    const entry: BoundaryRead = {
      atUtc: nowUtc, actorId, patientId, fromStore: "clinical",
      purpose, allowed: false, reason: `${purpose}-consent-required`,
    };
    log.push(entry);
    return { allowed: false, entry };
  }
  const entry: BoundaryRead = {
    atUtc: nowUtc, actorId, patientId, fromStore: "clinical",
    purpose, allowed: true, reason: "purpose-consented",
  };
  log.push(entry);
  return { allowed: true, entry };
}

/** Marketing use of clinical data is refused unconditionally. */
export function authorizeMarketingUse(): { allowed: false; reason: string } {
  return { allowed: false, reason: "Clinical data is never available for marketing." };
}

export function revokeConsent(
  grants: readonly ConsentGrant[],
  purpose: ConsentPurpose,
  nowUtc: string,
): ConsentGrant[] {
  return grants.map((g) =>
    g.purpose === purpose && g.revokedAtUtc === null
      ? { ...g, revokedAtUtc: nowUtc }
      : g,
  );
}
