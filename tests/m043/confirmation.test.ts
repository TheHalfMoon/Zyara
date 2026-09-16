// M043 synthetic qualification.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  ConfirmationDesk,
  renderChallenge,
  type ActionDraft,
} from "@zyara/action-confirmation";

function draft(id: string): ActionDraft {
  const params = { provider: "clin-a", slot: "s1" };
  return {
    draftId: id, tenantId: "t1", action: "book",
    params, challenge: renderChallenge("book", params),
    issuedAtUtc: "2026-09-20T07:00:00.000Z",
    expiresAtUtc: "2026-09-20T08:00:00.000Z",
    idempotencyKey: "k-" + id,
  };
}

describe("M043 action confirmation", () => {
  it("accepts only the exact challenge answer", () => {
    const desk = new ConfirmationDesk();
    desk.issue(draft("d1"));
    const good = desk.confirm("d1", "book(provider=clin-a, slot=s1)", "2026-09-20T07:10:00.000Z");
    assert.equal("error" in good, false);
    if (!("error" in good)) assert.equal(good.receiptId, "receipt-d1");
    const desk2 = new ConfirmationDesk();
    desk2.issue(draft("d2"));
    const mismatch = desk2.confirm("d2", "book(provider=clin-b, slot=s1)", "2026-09-20T07:10:00.000Z");
    assert.equal("error" in mismatch, true);
  });
  it("rejects expired confirmations and unknown drafts", () => {
    const desk = new ConfirmationDesk();
    desk.issue(draft("d1"));
    assert.equal("error" in desk.confirm("d1", "book(provider=clin-a, slot=s1)", "2026-09-20T09:00:00.000Z"), true);
    assert.equal("error" in desk.confirm("nope", "x", "2026-09-20T07:10:00.000Z"), true);
  });
  it("double submit returns the original receipt", () => {
    const desk = new ConfirmationDesk();
    desk.issue(draft("d1"));
    const first = desk.confirm("d1", "book(provider=clin-a, slot=s1)", "2026-09-20T07:10:00.000Z");
    const second = desk.confirm("d1", "book(provider=clin-a, slot=s1)", "2026-09-20T07:11:00.000Z");
    assert.deepEqual(first, second);
    assert.equal(desk.attemptsFor("d1").filter((a) => a.outcome === "accepted").length, 1);
  });
  it("renders deterministic challenges", () => {
    assert.equal(
      renderChallenge("cancel", { b: "2", a: "1" }),
      "cancel(a=1, b=2)",
    );
  });
});
