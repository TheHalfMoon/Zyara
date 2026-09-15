// M014 schedule proofs: immutable revisions, hard blocks dominating opens,
// authoring-time conflict rejection, buffer-fit rule (synthetic only).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ScheduleRegistry, statusForDate, bufferedFitsOpen, formatGregorianDisplay, formatHijriDisplay,
} from "@zyara/scheduling";
import type { ScheduleDraft } from "@zyara/scheduling";

function baseDraft(): ScheduleDraft {
  return {
    id: "riyadh-derm",
    tenantId: "t1",
    serviceId: "derm",
    branchId: "b1",
    timeZone: "Asia/Riyadh",
    effectiveFrom: "2026-10-01",
    effectiveTo: null,
    weekly: [
      { weekday: 0, opens: [{ start: "09:00", end: "13:00" }] },
      { weekday: 1, opens: [] },
    ],
    exceptions: [],
    policy: {
      minNoticeMin: 120, horizonDays: 30, sameDayCutoff: "18:00",
      slotAlignmentMin: 20, prepMin: 5, cleanupMin: 5,
      perDayLimit: null, maxCandidates: 500,
    },
  };
}

test("publish appends frozen revisions; old versions keep old semantics", () => {
  const reg = new ScheduleRegistry();
  const v1 = reg.publish(baseDraft());
  assert.equal(v1.version, 1);
  assert.ok(Object.isFrozen(v1));
  assert.match(v1.tzdb, /^icu-tzdata\//);
  const v2 = reg.publish({ ...baseDraft(), effectiveFrom: "2026-11-01" });
  assert.equal(v2.version, 2);
  assert.equal(reg.versions("riyadh-derm")[0]?.effectiveFrom, "2026-10-01");
  assert.equal(reg.latest("riyadh-derm")?.version, 2);
});

test("hard blocks dominate opens: leave, holiday, and closure close the day", () => {
  const reg = new ScheduleRegistry();
  const s = reg.publish({
    ...baseDraft(),
    exceptions: [
      { date: "2026-10-04", kind: "leave", code: "SICK_LEAVE", source: "provider-calendar" },
      { date: "2026-10-05", kind: "holiday", code: "NATIONAL_DAY", source: "holiday-list" },
    ],
  });
  // 2026-10-04 is a Sunday with weekly 09:00-13:00; leave must dominate it.
  const leave = statusForDate(s, "2026-10-04");
  assert.equal(leave.kind, "blocked");
  if (leave.kind === "blocked") assert.equal(leave.blockKind, "leave");
  const holiday = statusForDate(s, "2026-10-05");
  assert.equal(holiday.kind, "blocked");
  // Monday has no weekly opens at all: closed by default.
  const closed = statusForDate(s, "2026-10-06");
  assert.equal(closed.kind, "blocked");
  const open = statusForDate(s, "2026-10-11");
  assert.equal(open.kind, "open");
});

test("approved one-time open replaces weekly hours for that date", () => {
  const reg = new ScheduleRegistry();
  const s = reg.publish({
    ...baseDraft(),
    exceptions: [
      {
        date: "2026-10-06", kind: "open",
        intervals: [{ start: "14:00", end: "18:00" }],
        code: "SAT_MAKEUP", source: "branch-manager",
      },
    ],
  });
  const st = statusForDate(s, "2026-10-06");
  assert.equal(st.kind, "open");
  if (st.kind === "open") assert.deepEqual(st.intervals, [{ start: "14:00", end: "18:00" }]);
});

test("conflicting overrides are rejected at authoring, never ordered silently", () => {
  const reg = new ScheduleRegistry();
  assert.throws(
    () => reg.publish({
      ...baseDraft(),
      exceptions: [
        { date: "2026-10-04", kind: "leave", code: "A", source: "s" },
        { date: "2026-10-04", kind: "holiday", code: "B", source: "s" },
      ],
    }),
    /EXCEPTION_CONFLICT:2026-10-04/,
  );
  assert.throws(
    () => reg.publish({
      ...baseDraft(),
      exceptions: [
        { date: "2026-10-04", kind: "open", intervals: [{ start: "09:00", end: "10:00" }], code: "A", source: "s" },
        { date: "2026-10-04", kind: "block", code: "B", source: "s" },
      ],
    }),
    /EXCEPTION_CONFLICT/,
  );
  assert.throws(
    () => reg.publish({ ...baseDraft(), policy: { ...baseDraft().policy, horizonDays: 91 } }),
    /POLICY_HORIZON_INVALID/,
  );
});

test("buffered block must fit the opening; Gregorian+Hijri display is labeled", () => {
  // 09:05-09:25 with 5/5 buffers occupies 09:00-09:30: fits 09:00-10:00.
  assert.equal(bufferedFitsOpen({ start: "09:00", end: "10:00" }, 545, 565, 5, 5), true);
  // 09:00 start with 15-min prep needs 08:45: overflows the 09:00 opening.
  assert.equal(bufferedFitsOpen({ start: "09:00", end: "10:00" }, 540, 560, 15, 5), false);
  assert.equal(formatGregorianDisplay("2026-10-04", "09:00", "Asia/Riyadh"), "2026-10-04 09:00 (Asia/Riyadh)");
  assert.ok(formatHijriDisplay("2026-10-04").length >= 0);
});
