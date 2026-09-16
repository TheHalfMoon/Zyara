// M017 limited verified delegate scheduling. English only.
// Grants are explicit, scoped, verifiable, revocable, checked at action time.
// Clinical delegation is separate and not granted here. Guardian route without
// canonical approval is disabled (see GUARDIAN_ROUTE_ENABLED = false).

export const GUARDIAN_ROUTE_ENABLED = false;

export interface DelegateGrant {
  grantId: string;
  patientId: string;
  delegateId: string;
  scope: string[];
  expiresAtIso: string;
  revoked: boolean;
}

export interface DelegateStore {
  grants: Map<string, DelegateGrant>;
}

export function createStore(): DelegateStore {
  return { grants: new Map() };
}

export function issueGrant(
  store: DelegateStore,
  grant: Omit<DelegateGrant, "revoked">,
): DelegateGrant {
  const full: DelegateGrant = { ...grant, revoked: false };
  store.grants.set(grant.grantId, full);
  return full;
}

export function revokeGrant(store: DelegateStore, grantId: string): void {
  const existing = store.grants.get(grantId);
  if (!existing) throw new Error("UNKNOWN_GRANT");
  store.grants.set(grantId, { ...existing, revoked: true });
}

export function authorizeAction(
  store: DelegateStore,
  args: { patientId: string; actorId: string; action: string; nowIso: string },
): { allowed: boolean; reason: string } {
  if (args.actorId === args.patientId) return { allowed: true, reason: "SELF" };
  for (const grant of store.grants.values()) {
    if (grant.delegateId !== args.actorId || grant.patientId !== args.patientId) continue;
    if (grant.revoked) continue;
    if (grant.expiresAtIso <= args.nowIso) continue;
    if (!grant.scope.includes(args.action)) continue;
    return { allowed: true, reason: `GRANT:${grant.grantId}` };
  }
  return { allowed: false, reason: "NO_ACTIVE_GRANT" };
}

export function guardianRoute(): { enabled: false; reason: string } {
  return { enabled: false, reason: "GUARDIAN_POLICY_NOT_APPROVED" };
}
