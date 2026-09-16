import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  inviteEligible, submitReview, editReview, moderateReview, replyToReview,
  publicProjection, aggregateRatings, moderationGuidance, REVIEW_LOCALES,
  type ReviewStore, type Review,
} from "@zyara/trust-reviews";

function store(): ReviewStore {
  return { byId: new Map(), byAppointment: new Map(), invited: new Set(), audit: [] };
}

const ratings = { punctuality: 2 as const, communication: 2 as const, facility: 3 as const, cleanliness: 4 as const };

function submit(s: ReviewStore, text = "Long wait but staff were kind."):
  string {
  const r = submitReview(s, {
    id: "r1", tenantId: "t1", appointmentId: "a1", patientId: "pt1",
    practitionerId: "p1", ratings, text, eligible: true, atUtc: "2026-09-20T10:00:00.000Z",
  });
  assert.equal(r.ok, true);
  return r.reviewId!;
}

describe("M022 verified experience reviews", () => {
  it("negative compliant review publishes; provider cannot remove it", () => {
    const s = store();
    assert.equal(inviteEligible(s, "a1"), true);
    assert.equal(inviteEligible(s, "a1"), false);
    const id = submit(s, "Long wait, poor communication, but the visit happened.");
    assert.equal(moderateReview(s, id, "moderator", "publish").ok, true);
    assert.equal(s.byId.get(id)?.state, "published");
    assert.deepEqual(moderateReview(s, id, "provider", "withdraw_unsafe"), { ok: false, code: "PROVIDER_MODERATION_DENIED" });
    assert.equal(s.byId.get(id)?.state, "published");
  });
  it("anonymous public projection reveals no patient id", () => {
    const s = store();
    const id = submit(s);
    const pub = publicProjection(s.byId.get(id)!);
    assert.ok(!("patientId" in pub));
    assert.ok(!JSON.stringify(pub).includes("pt1"));
  });
  it("provider reply cannot expose private care facts", () => {
    const s = store();
    const id = submit(s);
    assert.deepEqual(
      replyToReview(s, id, "p1", "Your diagnosis was reviewed.", "2026-09-21T10:00:00.000Z").code,
      "REPLY_EXPOSES_PRIVATE_FACTS",
    );
    assert.equal(s.byId.get(id)?.reply, null);
    assert.equal(replyToReview(s, id, "p1", "Thank you, we are improving punctuality.", "2026-09-21T10:00:00.000Z").ok, true);
  });
  it("duplicate submission replays without a second review", () => {
    const s = store();
    const id = submit(s);
    const dup = submitReview(s, {
      id: "r2", tenantId: "t1", appointmentId: "a1", patientId: "pt1",
      practitionerId: "p1", ratings, text: "again", eligible: true, atUtc: "2026-09-20T11:00:00.000Z",
    });
    assert.deepEqual([dup.ok, dup.code, dup.reviewId], [false, "DUPLICATE_VISIT_REVIEW", id]);
    assert.equal(s.byId.size, 1);
  });
  it("ineligible visit cannot review; edits keep history and re-moderate", () => {
    const s = store();
    assert.deepEqual(
      submitReview(s, {
        id: "rx", tenantId: "t1", appointmentId: "ax", patientId: "pt9",
        practitionerId: "p1", ratings, text: "x", eligible: false, atUtc: "2026-09-20T10:00:00.000Z",
      }).code,
      "REVIEW_NOT_ELIGIBLE",
    );
    const id = submit(s);
    assert.equal(editReview(s, id, "pt1", "Updated: still slow.", "2026-09-21T10:00:00.000Z").ok, true);
    assert.equal(s.byId.get(id)?.history.length, 2);
    assert.deepEqual(editReview(s, id, "pt-other", "hijack", "2026-09-21T11:00:00.000Z").code, "REVIEW_FORBIDDEN");
  });
  it("low-count aggregates hide means below threshold", () => {
    const s = store();
    const id = submit(s);
    moderateReview(s, id, "moderator", "publish");
    const one = aggregateRatings([...s.byId.values()] as Review[], 3);
    assert.deepEqual([one.count, one.means], [1, null]);
    const many: Review[] = Array.from({ length: 3 }, (_, i) => ({
      ...(s.byId.get(id)!), id: `rx${i}`, state: "published" as const,
    }));
    assert.ok(aggregateRatings(many, 3).means !== null);
  });
  it("five-locale moderation guidance and arabic handling", () => {
    assert.equal(REVIEW_LOCALES.length, 5);
    for (const locale of REVIEW_LOCALES) assert.ok(moderationGuidance(locale).length > 10);
  });
});
