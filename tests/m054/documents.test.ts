// M054 synthetic qualification (incl. child packet M054.1 transport).
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  acceptDocument,
  reminderCopy,
  scheduleReminder,
} from "@zyara/patient-documents";

const QUIET = { startLocal: "21:00", endLocal: "08:00" };

describe("M054 documents and reminders", () => {
  it("gates documents on consent and clean scans", () => {
    assert.equal("error" in acceptDocument(
      { docId: "d1", patientId: "p1", kind: "lab-pdf", scanStatus: "clean", consented: false }), true);
    assert.equal("error" in acceptDocument(
      { docId: "d1", patientId: "p1", kind: "lab-pdf", scanStatus: "infected", consented: true }), true);
    assert.equal("error" in acceptDocument(
      { docId: "d1", patientId: "p1", kind: "lab-pdf", scanStatus: "pending", consented: true }), true);
    assert.equal("error" in acceptDocument(
      { docId: "d1", patientId: "p1", kind: "lab-pdf", scanStatus: "clean", consented: true }), false);
  });
  it("schedules reminders with consent, quiet hours and idempotency", () => {
    assert.equal("error" in scheduleReminder(
      { reminderId: "r1", patientId: "p1", medicationName: "Vitamin D", timeLocal: "08:00", consentedChannel: null, clinicianSourced: true, timeZone: "Asia/Riyadh" },
      "2026-09-20T07:00:00.000Z", QUIET), true);
    const ok = scheduleReminder(
      { reminderId: "r1", patientId: "p1", medicationName: "Vitamin D", timeLocal: "08:00", consentedChannel: "sms", clinicianSourced: true, timeZone: "Asia/Riyadh" },
      "2026-09-20T19:30:00.000Z", QUIET);
    assert.equal("error" in ok, false);
    if (!("error" in ok)) {
      assert.ok(ok.firstContactAtUtc > "2026-09-20T19:30:00.000Z");
      assert.equal(ok.idempotencyKey, "med-reminder:r1:sms");
    }
  });
  it("keeps reminders informational; dose claims need clinicians", () => {
    const info = reminderCopy(
      { reminderId: "r1", patientId: "p1", medicationName: "Vitamin D", timeLocal: "08:00", consentedChannel: "sms", clinicianSourced: false, timeZone: "Asia/Riyadh" });
    assert.equal("error" in info, false);
    if (!("error" in info)) assert.ok(info.copy.includes("informational only"));
    assert.equal("error" in reminderCopy(
      { reminderId: "r2", patientId: "p1", medicationName: "Change dose to 50mg", timeLocal: "08:00", consentedChannel: "sms", clinicianSourced: false, timeZone: "Asia/Riyadh" }), true);
  });
});
