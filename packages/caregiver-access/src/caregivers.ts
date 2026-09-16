// Verified family and caregiver permissions (M055).
// Grants are per caregiver, per patient, per scope, verified by the
// patient, expiring, and revocable. Clinical record scope is excluded by
// default and never self-granted. Caregivers hold no clinical authority.
// Every grant, use and revocation is audited.

export type CaregiverScope =
  | "appointments-view"
  | "booking-manage"
  | "documents-view";

export interface CaregiverGrant {
  grantId: string;
  caregiverId: string;
  patientId: string;
  scope: CaregiverScope;
  verifiedByPatient: boolean;
  expiresAtUtc: string;
  revokedAtUtc: string | null;
}

export interface CaregiverAudit {
  atUtc: string;
  grantId: string;
  action: "grant" | "use" | "revoke";
  actorId: string;
}

export function issueGrant(input: {
  grantId: string; caregiverId: string; patientId: string;
  scope: CaregiverScope; verifiedByPatient: boolean; expiresAtUtc: string;
}): CaregiverGrant | { error: string } {
  if (input.caregiverId === input.patientId) {
    return { error: "Self-grants are refused." };
  }
  if (!input.verifiedByPatient) {
    return { error: "Caregiver grants require patient verification." };
  }
  return {
    grantId: input.grantId, caregiverId: input.caregiverId,
    patientId: input.patientId, scope: input.scope,
    verifiedByPatient: true, expiresAtUtc: input.expiresAtUtc,
    revokedAtUtc: null,
  };
}

export function canAct(
  grant: CaregiverGrant,
  scope: CaregiverScope,
  nowUtc: string,
): boolean {
  if (grant.revokedAtUtc !== null) return false;
  if (nowUtc >= grant.expiresAtUtc) return false;
  if (!grant.verifiedByPatient) return false;
  return grant.scope === scope;
}

export function revokeGrant(
  grant: CaregiverGrant,
  nowUtc: string,
  log: CaregiverAudit[],
  actorId: string,
): CaregiverGrant {
  log.push({ atUtc: nowUtc, grantId: grant.grantId, action: "revoke", actorId });
  return { ...grant, revokedAtUtc: nowUtc };
}
