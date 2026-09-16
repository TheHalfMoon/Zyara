// Safe cancellation and rescheduling (M018). English only.
// Preservation rule: the original appointment is voided only after the
// replacement commit succeeds. A failed replacement leaves the original
// intact. Change records are versioned and idempotent. Safe links separate
// preview (GET, read-only) from action (POST, token-bound).

export type ChangeKind = "cancel" | "reschedule";
export type ChangeState = "requested" | "committed" | "rejected" | "superseded";
export type AppointmentLifecycle = "booked" | "cancelled" | "replaced";

export interface ManagedAppointment {
  id: string;
  tenantId: string;
  patientId: string;
  serviceId: string;
  startUtc: string;
  endUtc: string;
  lifecycle: AppointmentLifecycle;
  version: number;
  replacedById: string | null;
}

export interface ChangeRequest {
  changeId: string;
  kind: ChangeKind;
  appointmentId: string;
  tenantId: string;
  actorId: string;
  patientId: string;
  /** Client-supplied idempotency key, opaque, max 128 chars. */
  idempotencyKey: string;
  newStartUtc: string | null;
  newEndUtc: string | null;
  reason: string | null;
  cutoffIso: string;
  nowIso: string;
}

export interface ChangeRecord {
  changeId: string;
  kind: ChangeKind;
  appointmentId: string;
  state: ChangeState;
  version: number;
  lastReason: string;
  replacementId: string | null;
}

export interface ChangeStore {
  appointments: Map<string, ManagedAppointment>;
  changes: Map<string, ChangeRecord>;
  byIdempotency: Map<string, string>;
  outcomes: { retained: number; cancelled: number; replaced: number; duplicates: number };
}

export function createChangeStore(): ChangeStore {
  return {
    appointments: new Map(),
    changes: new Map(),
    byIdempotency: new Map(),
    outcomes: { retained: 0, cancelled: 0, replaced: 0, duplicates: 0 },
  };
}

export function seedAppointment(store: ChangeStore, appt: ManagedAppointment): void {
  store.appointments.set(appt.id, { ...appt });
}

function replayIfDuplicate(store: ChangeStore, key: string): ChangeRecord | null {
  const existingId = store.byIdempotency.get(key);
  if (!existingId) return null;
  const existing = store.changes.get(existingId);
  if (!existing) return null;
  store.outcomes.duplicates += 1;
  return { ...existing };
}

/** Versioned cancellation. Idempotent; already-cancelled is a stable replay. */
export function cancelAppointment(store: ChangeStore, req: ChangeRequest): ChangeRecord {
  const dup = replayIfDuplicate(store, req.idempotencyKey);
  if (dup) return dup;
  const appt = store.appointments.get(req.appointmentId);
  if (!appt || appt.tenantId !== req.tenantId || appt.patientId !== req.patientId) {
    return record(store, req, "rejected", "UNKNOWN_OR_FOREIGN_APPOINTMENT", null);
  }
  if (appt.lifecycle === "cancelled") {
    return record(store, req, "committed", "ALREADY_CANCELLED_REPLAY", null);
  }
  if (appt.lifecycle === "replaced") {
    return record(store, req, "rejected", "ALREADY_REPLACED", appt.replacedById);
  }
  if (req.nowIso >= req.cutoffIso) {
    return record(store, req, "rejected", "CUTOFF_REACHED_ASSISTANCE_REQUIRED", null);
  }
  appt.lifecycle = "cancelled";
  appt.version += 1;
  store.outcomes.cancelled += 1;
  return record(store, req, "committed", "CANCEL_COMMITTED", null);
}

export interface ReplacementDeps {
  /** Commits the replacement via the M016 authority. Throws on failure. */
  commitReplacement: (req: ChangeRequest) => string;
}

/**
 * Native replacement transaction. The original survives every failure: the
 * replacement is committed first, and the original is voided only after the
 * commit returns a replacement id. Counted as replaced, never as lost care.
 */
export function rescheduleAppointment(
  store: ChangeStore,
  req: ChangeRequest,
  deps: ReplacementDeps,
): ChangeRecord {
  const dup = replayIfDuplicate(store, req.idempotencyKey);
  if (dup) return dup;
  const appt = store.appointments.get(req.appointmentId);
  if (!appt || appt.tenantId !== req.tenantId || appt.patientId !== req.patientId) {
    return record(store, req, "rejected", "UNKNOWN_OR_FOREIGN_APPOINTMENT", null);
  }
  if (appt.lifecycle !== "booked") {
    return record(store, req, "rejected", "ORIGINAL_NOT_ACTIVE", appt.replacedById);
  }
  if (req.nowIso >= req.cutoffIso) {
    return record(store, req, "rejected", "CUTOFF_REACHED_ASSISTANCE_REQUIRED", null);
  }
  if (!req.newStartUtc || !req.newEndUtc) {
    return record(store, req, "rejected", "MISSING_NEW_SLOT", null);
  }
  let replacementId: string;
  try {
    replacementId = deps.commitReplacement(req);
  } catch {
    store.outcomes.retained += 1;
    return record(store, req, "rejected", "REPLACEMENT_FAILED_ORIGINAL_RETAINED", null);
  }
  appt.lifecycle = "replaced";
  appt.replacedById = replacementId;
  appt.version += 1;
  store.outcomes.replaced += 1;
  return record(store, req, "committed", "REPLACE_COMMITTED", replacementId);
}

function record(
  store: ChangeStore,
  req: ChangeRequest,
  state: ChangeState,
  reason: string,
  replacementId: string | null,
): ChangeRecord {
  const rec: ChangeRecord = {
    changeId: req.changeId,
    kind: req.kind,
    appointmentId: req.appointmentId,
    state,
    version: 1,
    lastReason: reason,
    replacementId,
  };
  store.changes.set(req.changeId, rec);
  store.byIdempotency.set(req.idempotencyKey, req.changeId);
  return { ...rec };
}

// Scoped expiring safe-link tokens. GET previews only; POST acts.
// Tokens bind tenant plus appointment plus patient plus kind plus expiry.

export interface SafeLinkClaims {
  tenantId: string;
  appointmentId: string;
  patientId: string;
  kind: ChangeKind;
  expiresAtIso: string;
  nonce: string;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(token: string): string {
  const padded = token.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeSafeLink(claims: SafeLinkClaims): string {
  return toBase64Url(JSON.stringify(claims));
}

export function decodeSafeLink(
  token: string,
  nowIso: string,
): { ok: boolean; claims?: SafeLinkClaims; reason?: string } {
  let claims: SafeLinkClaims;
  try {
    claims = JSON.parse(fromBase64Url(token)) as SafeLinkClaims;
  } catch {
    return { ok: false, reason: "MALFORMED_LINK" };
  }
  if (!claims.tenantId || !claims.appointmentId || !claims.patientId || !claims.kind) {
    return { ok: false, reason: "MALFORMED_LINK" };
  }
  if (nowIso >= claims.expiresAtIso) return { ok: false, reason: "LINK_EXPIRED" };
  return { ok: true, claims };
}

/** GET handler: preview only, never mutates. Safe for scanners and prefetch. */
export function previewSafeLink(
  store: ChangeStore,
  token: string,
  nowIso: string,
): { preview: boolean; mutated: false; appointment?: ManagedAppointment; reason?: string } {
  const decoded = decodeSafeLink(token, nowIso);
  if (!decoded.ok || !decoded.claims) return { preview: true, mutated: false, reason: decoded.reason };
  const appt = store.appointments.get(decoded.claims.appointmentId);
  if (!appt) return { preview: true, mutated: false, reason: "UNKNOWN_APPOINTMENT" };
  return { preview: true, mutated: false, appointment: { ...appt } };
}

/** POST handler: validates token binding, then routes to cancel/reschedule. */
export function actOnSafeLink(
  store: ChangeStore,
  args: {
    token: string;
    tenantId: string;
    patientId: string;
    changeId: string;
    idempotencyKey: string;
    newStartUtc: string | null;
    newEndUtc: string | null;
    cutoffIso: string;
    nowIso: string;
  },
  deps: ReplacementDeps,
): ChangeRecord {
  const decoded = decodeSafeLink(args.token, args.nowIso);
  if (!decoded.ok || !decoded.claims) {
    return {
      changeId: args.changeId,
      kind: "cancel",
      appointmentId: "unknown",
      state: "rejected",
      version: 1,
      lastReason: decoded.reason ?? "MALFORMED_LINK",
      replacementId: null,
    };
  }
  const claims = decoded.claims;
  if (claims.tenantId !== args.tenantId || claims.patientId !== args.patientId) {
    return {
      changeId: args.changeId,
      kind: claims.kind,
      appointmentId: claims.appointmentId,
      state: "rejected",
      version: 1,
      lastReason: "WRONG_PATIENT_LINK",
      replacementId: null,
    };
  }
  const req: ChangeRequest = {
    changeId: args.changeId,
    kind: claims.kind,
    appointmentId: claims.appointmentId,
    tenantId: args.tenantId,
    actorId: args.patientId,
    patientId: args.patientId,
    idempotencyKey: args.idempotencyKey,
    newStartUtc: args.newStartUtc,
    newEndUtc: args.newEndUtc,
    reason: null,
    cutoffIso: args.cutoffIso,
    nowIso: args.nowIso,
  };
  if (claims.kind === "cancel") return cancelAppointment(store, req);
  return rescheduleAppointment(store, req, deps);
}
