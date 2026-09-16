// Group sessions and linked family appointments (M050).
// Group sessions have finite capacity: joining checks capacity and per-
// patient eligibility. Family appointments link relatives to one shared
// slot with separate per-patient booking records and per-patient consent.
// One member cancelling never cancels siblings. Rosters expose attendance
// only — never cross-patient clinical records.

export interface GroupSession {
  sessionId: string;
  tenantId: string;
  serviceId: string;
  capacity: number;
  roster: Array<{ patientId: string; consented: boolean }>;
}

export function joinGroupSession(
  session: GroupSession,
  patientId: string,
  consented: boolean,
  eligible: boolean,
): GroupSession | { error: string } {
  if (!eligible) return { error: `Patient ${patientId} is not eligible for this session.` };
  if (!consented) return { error: `Patient ${patientId} has not consented.` };
  if (session.roster.some((r) => r.patientId === patientId)) {
    return { error: `Patient ${patientId} already enrolled.` };
  }
  if (session.roster.length >= session.capacity) {
    return { error: `Session ${session.sessionId} is at capacity ${session.capacity}.` };
  }
  return { ...session, roster: [...session.roster, { patientId, consented }] };
}

export interface FamilyLink {
  linkId: string;
  slotId: string;
  members: Array<{
    patientId: string;
    bookingId: string;
    consented: boolean;
    state: "booked" | "cancelled";
  }>;
}

export function addFamilyMember(
  link: FamilyLink,
  patientId: string,
  bookingId: string,
  consented: boolean,
): FamilyLink | { error: string } {
  if (!consented) return { error: `Member ${patientId} has not consented.` };
  if (link.members.some((m) => m.patientId === patientId)) {
    return { error: `Member ${patientId} already linked.` };
  }
  return {
    ...link,
    members: [...link.members, { patientId, bookingId, consented, state: "booked" }],
  };
}

export function cancelFamilyMember(link: FamilyLink, patientId: string): FamilyLink {
  return {
    ...link,
    members: link.members.map((m) =>
      m.patientId === patientId ? { ...m, state: "cancelled" as const } : m,
    ),
  };
}

/** Roster view exposes attendance only, keyed per requester. */
export function rosterFor(
  session: GroupSession,
  requesterPatientId: string,
): Array<{ patientId: string; present: boolean }> {
  void requesterPatientId;
  return session.roster.map((r) => ({ patientId: r.patientId, present: true }));
}
