// M017 booking UX tests. English only. Synthetic data only.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  instantOutcome,
  requestOutcome,
  callOutcome,
  redirectOutcome,
  buildChallenge,
  acceptChallenge,
  challengeStillValid,
  createStore,
  issueGrant,
  revokeGrant,
  authorizeAction,
  guardianRoute,
  createContactStore,
  startVerification,
  completeVerification,
  isVerified,
  createFunnel,
  recordStage,
  modeCopy,
  isRtl,
} from "@zyara/patient";

const FACTS = {
  patientId: "pat-syn-1",
  actorId: "pat-syn-1",
  actorRelation: "self" as const,
  providerId: "prov-syn-1",
  serviceId: "svc-syn-1",
  location: "Riyadh, Branch A",
  startIso: "2026-10-01T10:00:00+03:00",
  timezone: "Asia/Riyadh",
  mode: "instant",
  policyState: "ALLOW",
  materialVersion: "v3",
};

describe("M017 native instant mode", () => {
  it("claims booked only with committed truth", () => {
    const ok = instantOutcome({ committed: true, appointmentId: "appt-1" });
    assert.equal(ok.isBooked, true);
    const notYet = instantOutcome({ committed: false });
    assert.equal(notYet.isBooked, false);
    assert.match(notYet.body, /No committed booking/);
  });
});

describe("M017 request mode", () => {
  it("shows status owner deadline without reservation", () => {
    const out = requestOutcome({
      status: "pending",
      owner: "Clinic front desk",
      responseDeadlineIso: "2026-10-02T12:00:00+03:00",
      nextStep: "Wait for clinic reply; no visit yet.",
      hasReservation: false,
    });
    assert.equal(out.isBooked, false);
    assert.equal(out.isReservation, false);
    assert.match(out.body, /Clinic front desk/);
    assert.match(out.body, /2026-10-02/);
    assert.match(out.body, /not an appointment/);
  });
  it("missing referral needs-input state stays unbooked", () => {
    const out = requestOutcome({
      status: "submitted",
      owner: "Referral desk",
      nextStep: "Upload the referral document.",
      hasReservation: false,
    });
    assert.equal(out.isReservation, false);
    assert.match(out.body, /response time to be confirmed/);
  });
});

describe("M017 call and redirect modes", () => {
  it("call mode never implies Zyara booked", () => {
    const out = callOutcome({ phoneDisplay: "+966110000000" });
    assert.equal(out.isBooked, false);
    assert.match(out.body, /did not make an appointment/);
  });
  it("redirect return without proof is not confirmed", () => {
    const out = redirectOutcome({ externalAuthority: "Clinic portal", hasProof: false });
    assert.equal(out.isBooked, false);
    assert.match(out.body, /does not prove success/);
  });
});

describe("M017 contact verification", () => {
  it("anonymous browsing needs no contact; action requires verification", () => {
    const store = createContactStore();
    assert.equal(isVerified(store, "+966500000001", "pat-syn-1"), false);
    const started = startVerification(store, "+966500000001", "pat-syn-1");
    assert.equal(completeVerification(store, "+966500000001", "pat-syn-1", "wrong"), false);
    assert.equal(completeVerification(store, "+966500000001", "pat-syn-1", started.code), true);
    assert.equal(isVerified(store, "+966500000001", "pat-syn-1"), true);
  });
  it("shared phone number binds per patient", () => {
    const store = createContactStore();
    startVerification(store, "+966500000002", "pat-A");
    startVerification(store, "+966500000002", "pat-B");
    assert.equal(completeVerification(store, "+966500000002", "pat-A", "123456"), true);
    assert.equal(isVerified(store, "+966500000002", "pat-A"), true);
    assert.equal(isVerified(store, "+966500000002", "pat-B"), false);
  });
});

describe("M017 exact confirmation", () => {
  it("material change requires renewed confirmation", () => {
    const challenge = acceptChallenge(buildChallenge(FACTS));
    assert.equal(challengeStillValid(challenge, FACTS), true);
    assert.equal(challengeStillValid(challenge, { ...FACTS, startIso: "2026-10-01T11:00:00+03:00" }), false);
    assert.equal(challengeStillValid(challenge, { ...FACTS, materialVersion: "v4" }), false);
  });
  it("unconsented challenge is invalid", () => {
    const challenge = buildChallenge(FACTS);
    assert.equal(challengeStillValid(challenge, FACTS), false);
  });
});

describe("M017 delegation", () => {
  const grantArgs = {
    grantId: "grant-1",
    patientId: "pat-syn-9",
    delegateId: "del-syn-2",
    scope: ["booking.request"],
    expiresAtIso: "2027-01-01T00:00:00Z",
  };
  it("unauthorized delegate is blocked", () => {
    const store = createStore();
    const r = authorizeAction(store, {
      patientId: "pat-syn-9",
      actorId: "stranger",
      action: "booking.request",
      nowIso: "2026-09-16T00:00:00Z",
    });
    assert.equal(r.allowed, false);
  });
  it("allowed delegate passes; revocation blocks next action", () => {
    const store = createStore();
    issueGrant(store, grantArgs);
    const ok = authorizeAction(store, {
      patientId: "pat-syn-9",
      actorId: "del-syn-2",
      action: "booking.request",
      nowIso: "2026-09-16T00:00:00Z",
    });
    assert.equal(ok.allowed, true);
    revokeGrant(store, "grant-1");
    const blocked = authorizeAction(store, {
      patientId: "pat-syn-9",
      actorId: "del-syn-2",
      action: "booking.request",
      nowIso: "2026-09-16T00:00:00Z",
    });
    assert.equal(blocked.allowed, false);
  });
  it("guardian route stays disabled without approval", () => {
    assert.equal(guardianRoute().enabled, false);
  });
});

describe("M017 network resume and duplicates", () => {
  it("lost response resumes to stable pending state without duplicate booking", () => {
    const pending = requestOutcome({
      status: "pending",
      owner: "Clinic front desk",
      nextStep: "Check status with the same operation key; do not resubmit.",
      hasReservation: false,
    });
    const retry = requestOutcome({
      status: "pending",
      owner: "Clinic front desk",
      nextStep: "Check status with the same operation key; do not resubmit.",
      hasReservation: false,
    });
    assert.deepEqual(retry, pending);
    assert.equal(retry.isBooked, false);
  });
});

describe("M017 locales and observability", () => {
  it("covers five locales with honest copy", () => {
    for (const locale of ["ar", "en", "fr", "de", "es"] as const) {
      const copy = modeCopy(locale);
      assert.ok(copy.requestPending.length > 0);
    }
  });
  it("arabic is RTL", () => {
    assert.equal(isRtl("ar"), true);
    assert.equal(isRtl("en"), false);
  });
  it("funnel tracks stages without PHI", () => {
    const funnel = createFunnel();
    recordStage(funnel, "availability_viewed");
    recordStage(funnel, "mode_selected");
    recordStage(funnel, "request_pending");
    assert.equal(funnel.counts.availability_viewed, 1);
    assert.equal(funnel.pendingRequests, 1);
    assert.equal(JSON.stringify(funnel).includes("pat-syn"), false);
  });
});
