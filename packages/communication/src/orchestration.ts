// Consent-aware email/SMS orchestration (M020). English only.
//
// Messaging is downstream of canonical booking truth. Delivery state never
// mutates appointment state. Consent is checked at send time, not only at
// enqueue. Stale reminders are suppressed against authoritative appointment
// version and lifecycle. Callbacks are idempotent. Telemetry is counts only.

export type Channel = "email" | "sms" | "inapp";
export type MessageState =
  | "queued" | "suppressed" | "deferred_quiet_hours" | "sending"
  | "sent" | "delivered" | "failed_transient" | "failed_permanent";

export type SuppressionCode =
  | "APPOINTMENT_CANCELLED" | "APPOINTMENT_REPLACED" | "STALE_VERSION"
  | "STALE_TIME" | "CONSENT_REVOKED" | "FALLBACK_UNCONSENTED"
  | "QUIET_HOURS" | "INVALID_DESTINATION" | "CHANNEL_PAUSED";

export interface ChannelConsent {
  email: boolean;
  sms: boolean;
  inapp: boolean;
}

export interface QueuedMessage {
  id: string;
  tenantId: string;
  patientId: string;
  appointmentId: string;
  /** Appointment version the message was queued against. */
  appointmentVersion: number;
  /** Start instant the message describes. */
  appointmentStartUtc: string;
  channel: Channel;
  templateId: string;
  locale: string;
  destination: string;
  queuedAtUtc: string;
  idempotencyKey: string;
  attemptCount: number;
}

export interface AppointmentTruth {
  id: string;
  tenantId: string;
  lifecycle: "booked" | "cancelled" | "replaced";
  version: number;
  startUtc: string;
}

export type SendGate =
  | { ok: true }
  | { ok: false; code: SuppressionCode };

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

/** Explicit invalid-destination handling. No endless retry of permanent faults. */
export function validateDestination(channel: Channel, destination: string): boolean {
  if (channel === "email") return EMAIL_RE.test(destination) && destination.length <= 320;
  if (channel === "sms") return PHONE_RE.test(destination);
  return destination.length >= 1 && destination.length <= 128;
}

/** Patient-local quiet hours. Server timezone is never used as a substitute. */
export function inQuietHours(
  sendAtUtcIso: string,
  patientTzOffsetMinutes: number,
  quietStartLocal: string,
  quietEndLocal: string,
): boolean {
  const ms = Date.parse(sendAtUtcIso);
  if (Number.isNaN(ms)) throw new Error("COMMS_TIME_INVALID");
  const localMin = Math.floor((ms + patientTzOffsetMinutes * 60000) / 60000) % 1440;
  const norm = ((localMin % 1440) + 1440) % 1440;
  const toMin = (hhmm: string): number => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const start = toMin(quietStartLocal);
  const end = toMin(quietEndLocal);
  if (start === end) return false;
  if (start < end) return norm >= start && norm < end;
  return norm >= start || norm < end;
}

/**
 * Send-time gate. Order: destination, consent, channel pause, appointment
 * truth, staleness, quiet hours. Anything failing suppresses or defers;
 * nothing here mutates the appointment.
 */
export function gateSend(args: {
  message: QueuedMessage;
  truth: AppointmentTruth | null;
  consent: ChannelConsent;
  channelPaused: boolean;
  sendAtUtcIso: string;
  patientTzOffsetMinutes: number;
  quietStartLocal: string;
  quietEndLocal: string;
}): SendGate {
  const { message, truth, consent } = args;
  if (!validateDestination(message.channel, message.destination)) {
    return { ok: false, code: "INVALID_DESTINATION" };
  }
  if (message.channel === "email" && !consent.email) return { ok: false, code: "CONSENT_REVOKED" };
  if (message.channel === "sms" && !consent.sms) return { ok: false, code: "CONSENT_REVOKED" };
  if (message.channel === "inapp" && !consent.inapp) return { ok: false, code: "CONSENT_REVOKED" };
  if (args.channelPaused) return { ok: false, code: "CHANNEL_PAUSED" };
  if (!truth || truth.id !== message.appointmentId || truth.tenantId !== message.tenantId) {
    return { ok: false, code: "STALE_VERSION" };
  }
  if (truth.lifecycle === "cancelled") return { ok: false, code: "APPOINTMENT_CANCELLED" };
  if (truth.lifecycle === "replaced") return { ok: false, code: "APPOINTMENT_REPLACED" };
  if (truth.version !== message.appointmentVersion) return { ok: false, code: "STALE_VERSION" };
  if (truth.startUtc !== message.appointmentStartUtc) return { ok: false, code: "STALE_TIME" };
  if (inQuietHours(args.sendAtUtcIso, args.patientTzOffsetMinutes, args.quietStartLocal, args.quietEndLocal)) {
    return { ok: false, code: "QUIET_HOURS" };
  }
  return { ok: true };
}

/**
 * Fallback requires its own consent. Never silently fall back from SMS to
 * email or email to SMS without valid consent for the fallback channel.
 */
export function gateFallback(
  fallback: Channel,
  consent: ChannelConsent,
): SendGate {
  if (fallback === "email" && !consent.email) return { ok: false, code: "FALLBACK_UNCONSENTED" };
  if (fallback === "sms" && !consent.sms) return { ok: false, code: "FALLBACK_UNCONSENTED" };
  if (fallback === "inapp" && !consent.inapp) return { ok: false, code: "FALLBACK_UNCONSENTED" };
  return { ok: true };
}

export type ProviderOutcome = "accepted" | "transient_error" | "permanent_error" | "timeout_unknown";

export interface SendAttempt {
  nextState: MessageState;
  retryable: boolean;
  providerRef: string | null;
}

/**
 * Deterministic send-attempt mapping over a fake provider outcome.
 * Timeout is unknown, never success: the message stays retryable without
 * claiming delivery. Permanent errors never retry.
 */
export function mapProviderOutcome(outcome: ProviderOutcome, attemptCount: number): SendAttempt {
  if (outcome === "accepted") return { nextState: "sent", retryable: false, providerRef: `fake_${attemptCount + 1}` };
  if (outcome === "transient_error") return { nextState: "failed_transient", retryable: true, providerRef: null };
  if (outcome === "timeout_unknown") return { nextState: "failed_transient", retryable: true, providerRef: null };
  return { nextState: "failed_permanent", retryable: false, providerRef: null };
}

export interface CallbackRecord {
  callbackId: string;
  messageId: string;
  providerStatus: "delivered" | "failed";
}

/**
 * Idempotent callback handling keyed by provider callback id. Replays
 * return the original effect. Callbacks update delivery state only and
 * never mutate appointment truth.
 */
export function applyCallback(
  seen: Map<string, CallbackRecord>,
  cb: CallbackRecord,
): { applied: boolean; deliveryState: "delivered" | "failed" } {
  const existing = seen.get(cb.callbackId);
  if (existing) {
    return { applied: false, deliveryState: existing.providerStatus };
  }
  seen.set(cb.callbackId, { ...cb });
  return { applied: true, deliveryState: cb.providerStatus };
}

/** Same idempotency key plus same material digest replays; different digest conflicts. */
export function digestMessage(msg: Omit<QueuedMessage, "id" | "queuedAtUtc" | "attemptCount">): string {
  const canon = JSON.stringify([
    msg.tenantId, msg.patientId, msg.appointmentId, msg.appointmentVersion,
    msg.appointmentStartUtc, msg.channel, msg.templateId, msg.locale,
    msg.destination, msg.idempotencyKey,
  ]);
  let h = 2166136261;
  for (let i = 0; i < canon.length; i += 1) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `msg_${(h >>> 0).toString(16).padStart(8, "0")}`;
}

/** Privacy-minimized telemetry: counts, channels, templates, codes. No bodies. */
export interface CommsTelemetry {
  sent: number;
  delivered: number;
  suppressed: number;
  failedTransient: number;
  failedPermanent: number;
  callbackReplays: number;
  quietHourDeferrals: number;
  byChannel: Record<string, number>;
  byCode: Record<string, number>;
}

export function blankTelemetry(): CommsTelemetry {
  return {
    sent: 0, delivered: 0, suppressed: 0, failedTransient: 0,
    failedPermanent: 0, callbackReplays: 0, quietHourDeferrals: 0,
    byChannel: {}, byCode: {},
  };
}
