import { test } from "node:test";
import assert from "node:assert/strict";
import { GraphStore } from "@zyara/graph";
import { ImportPipeline } from "@zyara/graph-import";

const NOW = "2026-09-15T01:00:00.000Z";

function pipeline(): ImportPipeline {
  const pipe = new ImportPipeline(new GraphStore());
  pipe.registerSource({ id: "synthetic-feed", rights: "synthetic fixture, no redistribution limits", expiresAt: null });
  return pipe;
}

test("every applied assertion records source ownership + observed time", () => {
  const pipe = pipeline();
  const r = pipe.stage(
    [{ entityKind: "practitioner", externalKey: "L-1", labels: { ar: "ليلى", en: "Laila" }, source: "synthetic-feed", observedAt: NOW }],
    "t1",
    NOW,
  );
  assert.equal(r.applied, 1);
  assert.equal(pipe.ownerOf("import:L-1"), "synthetic-feed");
});

test("stale/expired source rights rejected; unknown source rejected", () => {
  const pipe = pipeline();
  pipe.registerSource({ id: "old-feed", rights: "expired", expiresAt: "2025-01-01T00:00:00.000Z" });
  pipe.stage(
    [
      { entityKind: "practitioner", externalKey: "X-1", labels: { en: "X" }, source: "old-feed", observedAt: NOW },
      { entityKind: "practitioner", externalKey: "X-2", labels: { en: "Y" }, source: "ghost", observedAt: NOW },
    ],
    "t1",
    NOW,
  );
  assert.deepEqual(pipe.rejects.map((x) => x.reason).sort(), ["SOURCE_RIGHTS_EXPIRED", "UNKNOWN_SOURCE"]);
});

test("conflicting Arabic/transliteration identity requires review, never auto-merges", () => {
  const pipe = pipeline();
  pipe.stage(
    [{ entityKind: "practitioner", externalKey: "L-1", labels: { ar: "ليلى", en: "Laila" }, source: "synthetic-feed", observedAt: NOW }],
    "t1",
    NOW,
  );
  const r = pipe.stage(
    [{ entityKind: "practitioner", externalKey: "L-2", labels: { ar: "ليلى", en: "Laila" }, source: "synthetic-feed", observedAt: NOW }],
    "t1",
    NOW,
  );
  assert.equal(r.applied, 0);
  assert.equal(pipe.suggestions.length, 1);
  assert.equal(pipe.suggestions[0]?.autoMerged, false);
});

test("merge/unmerge preserve history and emit projection updates", () => {
  const pipe = pipeline();
  const m = pipe.merge("import:L-1", "import:L-2", "reviewer-synthetic", NOW);
  assert.equal(m.undone, false);
  pipe.unmerge(m.id);
  assert.equal(m.undone, true);
  assert.equal(pipe.projectionEvents.length, 2);
  assert.ok(pipe.projectionEvents.every((e) => e.code === "projection.invalidated"));
});

test("withdrawal emits projection update; id-reuse quarantined", () => {
  const pipe = pipeline();
  pipe.stage(
    [{ entityKind: "practitioner", externalKey: "W-1", labels: { en: "W" }, source: "synthetic-feed", observedAt: NOW }],
    "t1",
    NOW,
  );
  pipe.withdraw("import:W-1", "t1", NOW);
  assert.equal(pipe.projectionEvents.length, 1);
  const r = pipe.stage(
    [{ entityKind: "practitioner", externalKey: "W-1", labels: { en: "W clone" }, source: "synthetic-feed", observedAt: NOW }],
    "t1",
    NOW,
  );
  assert.equal(r.applied, 0);
  assert.ok(pipe.rejects.some((x) => x.reason === "IDENTIFIER_REUSE"));
});

test("malformed batch rows rejected; refresh queue flags stale sources", () => {
  const pipe = pipeline();
  const r = pipe.stage(
    [{ entityKind: "practitioner", externalKey: "", labels: {}, source: "synthetic-feed", observedAt: "" }],
    "t1",
    NOW,
  );
  assert.equal(r.applied, 0);
  assert.ok(pipe.rejects.some((x) => x.reason === "MALFORMED_ROW"));
  const due = pipe.refresh({ "synthetic-feed": "2026-08-01T00:00:00.000Z", fresh: NOW }, NOW, 7 * 86_400_000);
  assert.deepEqual(due, ["synthetic-feed"]);
});
