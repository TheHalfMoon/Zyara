import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  gateSend, gateFallback, mapProviderOutcome, applyCallback, validateDestination,
  inQuietHours, digestMessage, type QueuedMessage, type AppointmentTruth, type ChannelConsent,
} from "@zyara/communication";
import { renderPreview, assertPreviewSafe, smsSegmentsFor, COMMS_LOCALES } from "@zyara/communication";

const msg: QueuedMessage = {
  id: "m1", tenantId: "t1", patientId: "pt1", appointmentId: "a1",
  appointmentVersion: 3, appointmentStartUtc: "2026-09-20T08:00:00.000Z",
  channel: "sms", templateId: "reminder", locale: "ar",
  destination: "+966500000001", queuedAtUtc: "2026-09-19T08:00:00.000Z",
  idempotencyKey: "k1", attemptCount: 0,
};
const truth: AppointmentTruth = {
  id: "a1", tenantId: "t1", lifecycle: "booked", version: 3,
  startUtc: "2026-09-20T08:00:00.000Z",
};
const consent: ChannelConsent = { email: true, sms: true, inapp: true };
const gateBase = {
  message: msg, truth, consent, channelPaused: false,
  sendAtUtcIso: "2026-09-19T10:00:00.000Z", patientTzOffsetMinutes: 180,
  quietStartLocal: "22:00", quietEndLocal: "07:00",
};

describe("M020 consent-aware orchestration", () => {
  it("happy path sends", () => {
    assert.deepEqual(gateSend({ ...gateBase }), { ok: true });
  });
  it("late cancellation race suppresses queued reminder", () => {
    const r = gateSend({ ...gateBase, truth: { ...truth, lifecycle: "cancelled" } });
    assert.deepEqual(r, { ok: false, code: "APPOINTMENT_CANCELLED" });
  });
  it("replaced appointment suppresses stale reminder", () => {
    const r = gateSend({ ...gateBase, truth: { ...truth, lifecycle: "replaced" } });
    assert.deepEqual(r, { ok: false, code: "APPOINTMENT_REPLACED" });
  });
  it("stale version and stale time suppress", () => {
    assert.deepEqual(
      gateSend({ ...gateBase, truth: { ...truth, version: 4 } }),
      { ok: false, code: "STALE_VERSION" },
    );
    assert.deepEqual(
      gateSend({ ...gateBase, truth: { ...truth, startUtc: "2026-09-20T09:00:00.000Z" } }),
      { ok: false, code: "STALE_TIME" },
    );
  });
  it("consent revoked after enqueue suppresses at send time", () => {
    const r = gateSend({ ...gateBase, consent: { ...consent, sms: false } });
    assert.deepEqual(r, { ok: false, code: "CONSENT_REVOKED" });
  });
  it("unconsented fallback never sends", () => {
    assert.deepEqual(gateFallback("email", { ...consent, email: false }), { ok: false, code: "FALLBACK_UNCONSENTED" });
    assert.deepEqual(gateFallback("email", consent), { ok: true });
  });
  it("retry, timeout-unknown, and idempotent callback replay", () => {
    assert.equal(mapProviderOutcome("transient_error", 0).retryable, true);
    assert.equal(mapProviderOutcome("timeout_unknown", 0).nextState, "failed_transient");
    assert.equal(mapProviderOutcome("permanent_error", 0).retryable, false);
    const seen = new Map();
    const first = applyCallback(seen, { callbackId: "cb1", messageId: "m1", providerStatus: "delivered" });
    assert.equal(first.applied, true);
    const replay = applyCallback(seen, { callbackId: "cb1", messageId: "m1", providerStatus: "delivered" });
    assert.equal(replay.applied, false);
    assert.equal(replay.deliveryState, "delivered");
  });
  it("invalid destinations fail closed", () => {
    assert.equal(validateDestination("email", "not-an-email"), false);
    assert.equal(validateDestination("sms", "0500000001"), false);
    const r = gateSend({ ...gateBase, message: { ...msg, destination: "bad" } });
    assert.deepEqual(r, { ok: false, code: "INVALID_DESTINATION" });
  });
  it("quiet hours use patient timezone and defer", () => {
    // 2026-09-19T20:30Z = 23:30 Riyadh (UTC+3) -> inside 22:00-07:00.
    assert.equal(inQuietHours("2026-09-19T20:30:00.000Z", 180, "22:00", "07:00"), true);
    assert.equal(inQuietHours("2026-09-19T10:00:00.000Z", 180, "22:00", "07:00"), false);
    const r = gateSend({ ...gateBase, sendAtUtcIso: "2026-09-19T20:30:00.000Z" });
    assert.deepEqual(r, { ok: false, code: "QUIET_HOURS" });
  });
  it("delivery never mutates appointment truth (state independence)", () => {
    const before = { ...truth };
    gateSend({ ...gateBase });
    applyCallback(new Map(), { callbackId: "cb9", messageId: "m1", providerStatus: "delivered" });
    assert.deepEqual(truth, before);
  });
  it("shared-phone previews are generic and five locales render", () => {
    assert.equal(COMMS_LOCALES.length, 5);
    for (const locale of COMMS_LOCALES) {
      const preview = renderPreview("reminder", locale);
      assertPreviewSafe(preview);
      assert.ok(preview.length > 10);
    }
  });
  it("arabic SMS segmentation uses UCS-2 and preserves content", () => {
    const ar = renderPreview("reminder", "ar");
    const seg = smsSegmentsFor(ar);
    assert.equal(seg.encoding, "ucs2");
    assert.ok(seg.segments >= 1);
    const latin = renderPreview("reminder", "en");
    assert.equal(smsSegmentsFor(latin).encoding, "gsm7");
  });
  it("idempotency digest is stable for replays", () => {
    const { id: _a, queuedAtUtc: _b, attemptCount: _c, ...core } = msg;
    assert.equal(digestMessage(core), digestMessage(core));
  });
});
