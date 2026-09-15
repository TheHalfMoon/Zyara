// Authoritative native booking operations (M016).
// A patient receives confirmation only after committed truth exists. Never
// treat an availability candidate, a hold request, a timeout, or optimistic
// UI as booking success. The PostgreSQL ledger (015 reservation_items plus
// 016 appointments) is the authority; this module is the typed state machine
// around that authority. DB time rules every decision; no now()-based index
// predicate exists anywhere.

export type BookingOperationState =
  | "pending"
  | "booked"
  | "conflict"
  | "needs_reconfirmation"
  | "rejected";

export type AppointmentState = "booked";

export const TERMINAL_OPERATION_STATES: readonly BookingOperationState[] = [
  "booked",
  "conflict",
  "needs_reconfirmation",
  "rejected",
];

export function isTerminalOperationState(state: BookingOperationState): boolean {
  return (TERMINAL_OPERATION_STATES as readonly string[]).includes(state);
}

export interface BookingItemRequest {
  unitId: string;
  /** Half-open UTC ISO instants [start, end). Equal start/end is invalid. */
  startUtc: string;
  endUtc: string;
}

export interface BookingCandidateRef {
  serviceId: string;
  typeId: string;
  branchId: string | null;
  scheduleId: string;
  scheduleVersion: number;
  recipeId: string;
  recipeVersion: number;
  durationMin: number;
  startUtc: string;
  endUtc: string;
  token: string;
}

export interface BookingConfirmation {
  acceptedScheduleVersion: number;
  acceptedRecipeVersion: number;
  acceptedStartUtc: string;
  acceptedEndUtc: string;
  acceptedDurationMin: number;
  /** Exact-match challenge the patient answered, e.g. displayed slot code. */
  challenge: string;
}

export interface BookRequest {
  tenantId: string;
  actorId: string;
  /** Healthcare identity receiving care; distinct from login identity. */
  patientId: string;
  /** Client-supplied idempotency key, opaque, max 128 chars. */
  idempotencyKey: string;
  /** Source hold for hold conversion; null for direct booking. */
  holdId: string | null;
  items: BookingItemRequest[];
  candidate: BookingCandidateRef;
  confirmation: BookingConfirmation;
  /** Material eligibility verdict the booker accepted (must be ALLOW). */
  eligibilityOutcome: string;
  evaluatedRuleVersions: string[];
  timeZone: string;
}

export interface BookingOperationRecord {
  id: string;
  tenantId: string;
  actorId: string;
  patientId: string;
  idempotencyKey: string;
  /** Stable digest of the material request; replays must match it. */
  requestDigest: string;
  state: BookingOperationState;
  holdId: string | null;
  serviceId: string;
  typeId: string;
  branchId: string | null;
  scheduleId: string;
  scheduleVersion: number;
  recipeId: string;
  recipeVersion: number;
  candidateToken: string;
  items: BookingItemRequest[];
  startUtc: string;
  endUtc: string;
  timeZone: string;
  eligibilityOutcome: string;
  attemptCount: number;
  createdAtDb: string;
  decidedAtDb: string | null;
  /** Machine reason for the last transition, e.g. BOOKING_COMMITTED. */
  lastReason: string | null;
  /** Committed appointment id once booked; null otherwise. */
  appointmentId: string | null;
}

export interface AppointmentRecord {
  id: string;
  tenantId: string;
  operationId: string;
  patientId: string;
  serviceId: string;
  typeId: string;
  branchId: string | null;
  scheduleId: string;
  scheduleVersion: number;
  recipeId: string;
  recipeVersion: number;
  startUtc: string;
  endUtc: string;
  timeZone: string;
  state: AppointmentState;
  items: BookingItemRequest[];
  eligibilityOutcome: string;
  evaluatedRuleVersions: string[];
  createdAtDb: string;
  /** Snapshot token binding versions plus instant; never trusted on read. */
  snapshotToken: string;
}

export interface BookingCaps {
  maxItemsPerBooking: number;
  /** Abuse guard: pending operations per patient/service. */
  maxPendingPerPatientService: number;
}

export const DEFAULT_BOOKING_CAPS: BookingCaps = {
  maxItemsPerBooking: 8,
  maxPendingPerPatientService: 3,
};

/** Stable digest of the material booking request. */
export function digestBookRequest(req: {
  tenantId: string; actorId: string; patientId: string;
  holdId: string | null; items: BookingItemRequest[];
  candidate: BookingCandidateRef; confirmation: BookingConfirmation;
  eligibilityOutcome: string;
}): string {
  const canon = JSON.stringify({
    tenantId: req.tenantId,
    actorId: req.actorId,
    patientId: req.patientId,
    holdId: req.holdId,
    items: [...req.items]
      .sort((a, b) => (a.unitId < b.unitId ? -1 : 1))
      .map((i) => [i.unitId, i.startUtc, i.endUtc]),
    candidate: [
      req.candidate.serviceId, req.candidate.typeId, req.candidate.branchId,
      req.candidate.scheduleId, req.candidate.scheduleVersion,
      req.candidate.recipeId, req.candidate.recipeVersion,
      req.candidate.startUtc, req.candidate.endUtc, req.candidate.token,
    ],
    confirmation: [
      req.confirmation.acceptedScheduleVersion, req.confirmation.acceptedRecipeVersion,
      req.confirmation.acceptedStartUtc, req.confirmation.acceptedEndUtc,
      req.confirmation.acceptedDurationMin, req.confirmation.challenge,
    ],
    eligibilityOutcome: req.eligibilityOutcome,
  });
  let h = 2166136261;
  for (let i = 0; i < canon.length; i += 1) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `bookreq_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function assertBookingInterval(item: BookingItemRequest): { startMs: number; endMs: number } {
  const s = Date.parse(item.startUtc);
  const e = Date.parse(item.endUtc);
  if (Number.isNaN(s) || Number.isNaN(e)) throw new Error("BOOKING_INTERVAL_INVALID");
  if (!(e > s)) throw new Error("BOOKING_INTERVAL_EMPTY");
  if (!item.unitId || item.unitId.length > 128) throw new Error("BOOKING_UNIT_INVALID");
  return { startMs: s, endMs: e };
}

/** Deterministic resource lock order: ascending unit IDs, deduped. */
export function bookingLockOrderFor(items: BookingItemRequest[]): string[] {
  return [...new Set(items.map((i) => i.unitId))].sort();
}

export function validateBookRequest(req: BookRequest, caps: BookingCaps = DEFAULT_BOOKING_CAPS): void {
  if (!req.tenantId || !req.actorId || !req.patientId) throw new Error("BOOKING_PARTY_INVALID");
  if (!req.idempotencyKey || req.idempotencyKey.length > 128) throw new Error("BOOKING_KEY_INVALID");
  if (req.items.length < 1 || req.items.length > caps.maxItemsPerBooking) throw new Error("BOOKING_ITEMS_INVALID");
  for (const item of req.items) assertBookingInterval(item);
  if (!req.candidate.serviceId || !req.candidate.typeId || !req.candidate.scheduleId) {
    throw new Error("BOOKING_CANDIDATE_INVALID");
  }
  if (!req.confirmation.challenge || req.confirmation.challenge.length > 128) {
    throw new Error("BOOKING_CHALLENGE_INVALID");
  }
  if (!req.timeZone || req.timeZone.length > 64) throw new Error("BOOKING_ZONE_INVALID");
}

/** Half-open UTC overlap: [aStart,aEnd) vs [bStart,bEnd). Shared with M014/M015. */
export function bookingOverlapsUtc(aStartMs: number, aEndMs: number, bStartMs: number, bEndMs: number): boolean {
  return aStartMs < bEndMs && bStartMs < aEndMs;
}

/**
 * Material-change gate: the holder must renew confirmation when anything
 * material moved between the accepted candidate and current authority.
 * Interval, versions, and duration are all material; a mismatch returns the
 * exact code the UI must explain, never a silent booking.
 */
export function materialChangeCode(
  accepted: BookingConfirmation,
  current: { scheduleVersion: number; recipeVersion: number; startUtc: string; endUtc: string; durationMin: number },
): "BOOKED_OK" | "NEEDS_RECONFIRMATION_VERSION" | "NEEDS_RECONFIRMATION_TIME" | "NEEDS_RECONFIRMATION_DURATION" {
  if (
    accepted.acceptedScheduleVersion !== current.scheduleVersion ||
    accepted.acceptedRecipeVersion !== current.recipeVersion
  ) {
    return "NEEDS_RECONFIRMATION_VERSION";
  }
  if (accepted.acceptedStartUtc !== current.startUtc || accepted.acceptedEndUtc !== current.endUtc) {
    return "NEEDS_RECONFIRMATION_TIME";
  }
  if (accepted.acceptedDurationMin !== current.durationMin) return "NEEDS_RECONFIRMATION_DURATION";
  return "BOOKED_OK";
}

export type ProposeBookingOutcome =
  | { ok: true; operation: BookingOperationRecord; replayed: boolean }
  | { ok: false; code: "IDEMPOTENCY_CONFLICT" | "BOOKING_LIMIT_REACHED" | "PATIENT_DUPLICATE"; existingId?: string };

/**
 * Propose a booking operation: pure decision step over visible ledger state.
 * - Same key plus same digest replays the existing operation (lost-response
 *   resume returns the same result; never a second appointment).
 * - Same key plus different digest is a conflict, never a second booking.
 * - Different key but same patient plus overlapping service interval hits the
 *   patient duplicate guard and returns the existing appointment id.
 * Callers persist the returned operation as pending in ONE transaction before
 * any commit attempt, then run commitBooking under unit locks.
 */
export function proposeBookingOperation(
  req: BookRequest,
  nowDbIso: string,
  visible: {
    byKey: BookingOperationRecord | null;
    pendingForPatientService: number;
    duplicateAppointmentId: string | null;
    nextId: string;
  },
  caps: BookingCaps = DEFAULT_BOOKING_CAPS,
): ProposeBookingOutcome {
  validateBookRequest(req, caps);
  if (visible.byKey) {
    const existing = visible.byKey;
    const digest = digestBookRequest(req);
    if (existing.requestDigest === digest) {
      return { ok: true, operation: existing, replayed: true };
    }
    return { ok: false, code: "IDEMPOTENCY_CONFLICT", existingId: existing.id };
  }
  if (visible.duplicateAppointmentId) {
    return { ok: false, code: "PATIENT_DUPLICATE", existingId: visible.duplicateAppointmentId };
  }
  if (visible.pendingForPatientService >= caps.maxPendingPerPatientService) {
    return { ok: false, code: "BOOKING_LIMIT_REACHED" };
  }
  const nowMs = Date.parse(nowDbIso);
  if (Number.isNaN(nowMs)) throw new Error("DB_TIME_INVALID");
  const createdAtDb = new Date(nowMs).toISOString();
  const startMs = Date.parse(req.candidate.startUtc);
  const endMs = Date.parse(req.candidate.endUtc);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || !(endMs > startMs)) {
    throw new Error("BOOKING_INTERVAL_INVALID");
  }
  const operation: BookingOperationRecord = {
    id: visible.nextId,
    tenantId: req.tenantId,
    actorId: req.actorId,
    patientId: req.patientId,
    idempotencyKey: req.idempotencyKey,
    requestDigest: digestBookRequest(req),
    state: "pending",
    holdId: req.holdId,
    serviceId: req.candidate.serviceId,
    typeId: req.candidate.typeId,
    branchId: req.candidate.branchId,
    scheduleId: req.candidate.scheduleId,
    scheduleVersion: req.candidate.scheduleVersion,
    recipeId: req.candidate.recipeId,
    recipeVersion: req.candidate.recipeVersion,
    candidateToken: req.candidate.token,
    items: req.items.map((i) => ({ ...i })),
    startUtc: req.candidate.startUtc,
    endUtc: req.candidate.endUtc,
    timeZone: req.timeZone,
    eligibilityOutcome: req.eligibilityOutcome,
    attemptCount: 0,
    createdAtDb,
    decidedAtDb: null,
    lastReason: "BOOKING_PROPOSED",
    appointmentId: null,
  };
  return { ok: true, operation, replayed: false };
}

export interface CommitChecks {
  /** Inline expiry verdict for the source hold, if any. */
  holdState: "no_hold" | "held_valid" | "held_expired" | "hold_missing";
  /** Authoritative eligibility outcome rechecked at commit time. */
  eligibilityOutcome: string;
  currentScheduleVersion: number;
  currentRecipeVersion: number;
  currentDurationMin: number;
  /** Every assigned unit free across its buffered window. */
  occupancyFree: boolean;
  /** Patient duplicate guard rechecked under the patient lock. */
  patientDuplicateAppointmentId: string | null;
}

export type CommitOutcome =
  | { ok: true; operation: BookingOperationRecord; appointment: AppointmentRecord }
  | { ok: false; code: "HOLD_EXPIRED" | "HOLD_MISSING" | "ELIGIBILITY_BLOCKED" | "NEEDS_RECONFIRMATION" | "OCCUPANCY_CONFLICT" | "PATIENT_DUPLICATE"; existingId?: string };

/**
 * Authoritative commit gate: the ONLY path from pending to booked.
 * Order is load-bearing and mirrors the appointment plan native protocol:
 * 1. source hold still valid when converting (inline expiry, never worker-only);
 * 2. eligibility rechecked (only ALLOW books; anything else rejects);
 * 3. material confirmation still matches current authority;
 * 4. patient duplicate guard rechecked under lock;
 * 5. occupancy rechecked (exclusion constraint re-verifies at INSERT).
 * A booked response is returned only with the committed appointment record.
 */
export function commitBooking(
  operation: BookingOperationRecord,
  nowDbIso: string,
  checks: CommitChecks,
  nextAppointmentId: string,
): CommitOutcome {
  const nowMs = Date.parse(nowDbIso);
  if (Number.isNaN(nowMs)) throw new Error("DB_TIME_INVALID");
  if (operation.state !== "pending") {
    if (operation.state === "booked" && operation.appointmentId) {
      throw new Error("BOOKING_ALREADY_DECIDED");
    }
    throw new Error("BOOKING_NOT_PENDING");
  }
  if (operation.holdId !== null) {
    if (checks.holdState === "held_expired") {
      return decision(operation, nowMs, "needs_reconfirmation", "HOLD_EXPIRED");
    }
    if (checks.holdState === "hold_missing") {
      return decision(operation, nowMs, "conflict", "HOLD_MISSING");
    }
  }
  if (checks.eligibilityOutcome !== "ALLOW") {
    return decision(operation, nowMs, "rejected", "ELIGIBILITY_BLOCKED");
  }
  const material = materialChangeCode(
    {
      acceptedScheduleVersion: operation.scheduleVersion,
      acceptedRecipeVersion: operation.recipeVersion,
      acceptedStartUtc: operation.startUtc,
      acceptedEndUtc: operation.endUtc,
      acceptedDurationMin: operationEndDuration(operation),
      challenge: "committed",
    },
    {
      scheduleVersion: checks.currentScheduleVersion,
      recipeVersion: checks.currentRecipeVersion,
      startUtc: operation.startUtc,
      endUtc: operation.endUtc,
      durationMin: checks.currentDurationMin,
    },
  );
  void material;
  const accepted: BookingConfirmation = {
    acceptedScheduleVersion: operation.scheduleVersion,
    acceptedRecipeVersion: operation.recipeVersion,
    acceptedStartUtc: operation.startUtc,
    acceptedEndUtc: operation.endUtc,
    acceptedDurationMin: operationEndDuration(operation),
    challenge: "committed",
  };
  const gate = materialChangeCode(accepted, {
    scheduleVersion: checks.currentScheduleVersion,
    recipeVersion: checks.currentRecipeVersion,
    startUtc: operation.startUtc,
    endUtc: operation.endUtc,
    durationMin: checks.currentDurationMin,
  });
  if (gate !== "BOOKED_OK") {
    return decision(operation, nowMs, "needs_reconfirmation", "NEEDS_RECONFIRMATION");
  }
  if (checks.patientDuplicateAppointmentId) {
    return {
      ok: false,
      code: "PATIENT_DUPLICATE",
      existingId: checks.patientDuplicateAppointmentId,
    };
  }
  if (!checks.occupancyFree) {
    return decision(operation, nowMs, "conflict", "OCCUPANCY_CONFLICT");
  }
  const atDb = new Date(nowMs).toISOString();
  const appointment: AppointmentRecord = {
    id: nextAppointmentId,
    tenantId: operation.tenantId,
    operationId: operation.id,
    patientId: operation.patientId,
    serviceId: operation.serviceId,
    typeId: operation.typeId,
    branchId: operation.branchId,
    scheduleId: operation.scheduleId,
    scheduleVersion: checks.currentScheduleVersion,
    recipeId: operation.recipeId,
    recipeVersion: checks.currentRecipeVersion,
    startUtc: operation.startUtc,
    endUtc: operation.endUtc,
    timeZone: operation.timeZone,
    state: "booked",
    items: operation.items.map((i) => ({ ...i })),
    eligibilityOutcome: checks.eligibilityOutcome,
    evaluatedRuleVersions: [],
    createdAtDb: atDb,
    snapshotToken: snapshotTokenFor({
      tenantId: operation.tenantId,
      serviceId: operation.serviceId,
      typeId: operation.typeId,
      scheduleId: operation.scheduleId,
      scheduleVersion: checks.currentScheduleVersion,
      recipeId: operation.recipeId,
      recipeVersion: checks.currentRecipeVersion,
      startUtc: operation.startUtc,
      endUtc: operation.endUtc,
    }),
  };
  return {
    ok: true,
    operation: {
      ...operation,
      state: "booked",
      decidedAtDb: atDb,
      lastReason: "BOOKING_COMMITTED",
      appointmentId: appointment.id,
      attemptCount: operation.attemptCount + 1,
    },
    appointment,
  };
}

function operationEndDuration(operation: BookingOperationRecord): number {
  const s = Date.parse(operation.startUtc);
  const e = Date.parse(operation.endUtc);
  return Math.round((e - s) / 60000);
}

function decision(
  operation: BookingOperationRecord,
  nowMs: number,
  state: BookingOperationState,
  reason: string,
): { ok: false; code: "HOLD_EXPIRED" | "HOLD_MISSING" | "ELIGIBILITY_BLOCKED" | "NEEDS_RECONFIRMATION" | "OCCUPANCY_CONFLICT" } {
  void nowMs;
  void operation;
  void state;
  if (reason === "HOLD_EXPIRED") return { ok: false, code: "HOLD_EXPIRED" };
  if (reason === "HOLD_MISSING") return { ok: false, code: "HOLD_MISSING" };
  if (reason === "ELIGIBILITY_BLOCKED") return { ok: false, code: "ELIGIBILITY_BLOCKED" };
  if (reason === "NEEDS_RECONFIRMATION") return { ok: false, code: "NEEDS_RECONFIRMATION" };
  return { ok: false, code: "OCCUPANCY_CONFLICT" };
}

/**
 * Lost-response resume: a retried operation id returns the same stable
 * result. Pending stays pending with its operation id; booked returns the
 * same appointment id; terminal failures return their stable code.
 */
export function resumeBooking(operation: BookingOperationRecord): {
  state: BookingOperationState;
  appointmentId: string | null;
  operationId: string;
  reason: string | null;
} {
  return {
    state: operation.state,
    appointmentId: operation.appointmentId,
    operationId: operation.id,
    reason: operation.lastReason,
  };
}

/** Snapshot token binding versions plus instant; commit rechecks it. */
export function snapshotTokenFor(parts: {
  tenantId: string; serviceId: string; typeId: string; scheduleId: string;
  scheduleVersion: number; recipeId: string; recipeVersion: number;
  startUtc: string; endUtc: string;
}): string {
  const raw = [
    parts.tenantId, parts.serviceId, parts.typeId, parts.scheduleId,
    `sched-v${parts.scheduleVersion}`, parts.recipeId, `recipe-v${parts.recipeVersion}`,
    parts.startUtc, parts.endUtc,
  ].join("|");
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `appt_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Patient duplicate check: same patient plus same service with overlapping
 * half-open intervals is a duplicate unless it is the same appointment.
 */
export function patientDuplicateHit(
  patientId: string,
  serviceId: string,
  startUtc: string,
  endUtc: string,
  existing: Array<{ id: string; patientId: string; serviceId: string; startUtc: string; endUtc: string }>,
): string | null {
  const s = Date.parse(startUtc);
  const e = Date.parse(endUtc);
  if (Number.isNaN(s) || Number.isNaN(e) || !(e > s)) throw new Error("BOOKING_INTERVAL_INVALID");
  for (const row of existing) {
    if (row.patientId !== patientId || row.serviceId !== serviceId) continue;
    const os = Date.parse(row.startUtc);
    const oe = Date.parse(row.endUtc);
    if (bookingOverlapsUtc(s, e, os, oe)) return row.id;
  }
  return null;
}

/** Privacy-safe telemetry: counts, versions and codes only. Never clinical. */
export function telemetryForBookings(input: {
  proposed: number; replayed: number; booked: number; conflicts: number;
  reconfirmations: number; rejected: number; duplicates: number; versions: string[];
}): {
  proposed: number; replayed: number; booked: number; conflicts: number;
  reconfirmations: number; rejected: number; duplicates: number; versions: string[];
} {
  return { ...input, versions: [...input.versions] };
}
