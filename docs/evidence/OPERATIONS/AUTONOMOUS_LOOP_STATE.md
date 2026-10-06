# Zyara Autonomous Loop — State and Operating Notes

This file keeps the loop's working state in the repository, not on any local machine. Every slice's evidence lives under `docs/evidence/`. All work is on pushed branches; no local worktree, temp file or memory is needed to resume. Update this file at each checkpoint.

## Live frontier (2026-10-07)

| Area | State | Record |
| --- | --- | --- |
| AIF-01A/B (capability contract + resolver) | merged, closed | `docs/evidence/AIF/AIF-01_CLOSURE.md` |
| AIF-02A/B (privacy egress + credential mediation) | merged, closed | `docs/evidence/AIF/AIF-02A/CLOSURE.md`, `AIF-02B/CLOSURE.md` |
| AIF-03A (model/prompt registry) | **PR TheHalfMoon/Zyara#126 held**: its CI workflow cannot be pushed (gate 1) | `docs/evidence/AIF/AIF-03A/`; the pending workflow is stored as `docs/evidence/AIF/AIF-03A/aif03a-ci.yml.pending` |
| GEO-01A/B/C (geo truth) | merged, closed (#118, #127, #128, #129) | `docs/evidence/GEO/GEO-01_CLOSURE.md` |
| M051 consent instant comparison | merged (#122) | consent suites M051, M052, M053 and M057 are not yet run by any CI workflow (gate 1) |

**Next dependency-ready slices:**

- GEO-02 (MapLibre renderer; needs a released `maplibre-gl` pin after license/SBOM review, and likely a web CI workflow);
- GEO-09 (spatial insights);
- GEO-10 (AI/voice geo tools, after AIF-01);
- AIF-03B onward, after AIF-03A merges.

**Follow-ups:**

- the N5 correlation-id rule rejects about 3% of random UUIDs (migrations 043/044/045 and TypeScript), so a new migration is needed;
- the repository-wide `pnpm/action-setup` SHA pin;
- consent-ci workflow (gate 1);
- PR #94 reconciliation (untouched).

## External gates

1. **`workflow` token scope.** The active account `TheHalfMoon` has `gist`, `read:org` and `repo`, but not `workflow`. Any push that touches `.github/workflows/` is refused. Fix: `gh auth refresh -h github.com -s workflow`. Other logged-in accounts have the scope, but the loop does not switch identity without the founder's explicit approval.
2. **Local machine.** On 2026-10-07 drive C: had under 1 GB free and Docker Desktop was unresponsive. The founder's instruction is not to depend on local state: the loop works from pushed branches and the GitHub API, and the PostgreSQL/PostGIS proof is CI.
3. Founder approval, production credentials, NPHIES onboarding and real clinic/patient validation remain out of scope, as always.

## Placement rule while gate 1 holds

A new slice gets CI only by living inside an existing workflow's path filters:

- AIF-02B is in `packages/privacy-egress` with tests in `tests/aif02a` (`aif02a-ci`).
- GEO-01B and GEO-01C are in `packages/geospatial`, with tests in `tests/geo01a` and checks in the GEO-01 PostGIS smoke (`geo01a-ci`).

Slices that need a genuinely new workflow wait for gate 1.

## Mandatory review tools (how they are actually run)

- **Jev 0.3.2:** `py -3 ~/.agents/skills/jev/scripts/jev run <spec.json> --text -s @file` (or `-s -`), with `PYTHONIOENCODING=utf-8`. The `jev.exe` on PATH is a different tool. Run the design challenge on the work packet, then post-implementation on each source file paired with its tests.
- **pstack `/ps-review`:** the interface is `~/.agents/skills/ps-review/SKILL.md`. Run fresh-context judge subagent(s) on the diff; a security trigger means one judge carries all four bars. Delta cycles are capped at 3, and the evidence goes in `PSTACK_EVIDENCE.md`.
- **Alibaba Open Code Review (v1.12.11 on this host):** delegate mode only (`ocr delegate preview --from origin/main --to HEAD`, `ocr delegate rule <files>`). There is no LLM key, so the host applies the rules and no OCR-model verdict is claimed.
- **Graft 0.21.1:** `graft telemetry disable` and `DO_NOT_TRACK=1`, then `graft build`, `graft check`, `graft callers`, `graft skeleton`. No `--deep` and no trail.
- CodeRabbit, Qodo and Cubic are not substitute evidence.

## Governance (unchanged)

- Normal merge commits only: `gh pr merge <n> --merge --match-head-commit <sha>`. No squash, rebase, force-push or history rewrite.
- Record the exact head, local qualification, Jev, OCR, pstack, Graft and CI, and inspect review threads before merging.
- After each merge: fetch `main`, record the merge SHA, verify post-merge CI, and write a closure record.
- Additive migrations only; RLS and database constraints; real PostgreSQL/PostGIS smokes in CI.
- No PHI to unqualified providers, no silent cloud fallback, and no raw secrets anywhere.

## Lessons recorded

- In Node patch scripts, `String.replace(a, b)` turns `$$` in `b` into `$`, which breaks PL/pgSQL dollar quoting. Use `replace(a, () => b)`.
- A `LANGUAGE sql` function body is validated at `CREATE`, so every table it reads must already exist. PL/pgSQL bodies are not.
- PostgreSQL checks unique indexes before deferred and composite foreign keys. Expected SQLSTATEs in smokes must follow that order.
- Advisory-lock guards with read-then-insert are exact only under READ COMMITTED. Refuse other isolation levels.

## Preserved local work

An uncommitted local W3 ops-tasks draft (2026-09-20, base `a7ef63d`) was found in a stale worktree. Main already carries a later, merged W3 (`040_ops_tasks.sql` and `w3-ci.yml` differ from it). The draft is preserved, not merged, on branch `archive/w3-ops-tasks-local-draft-2026-09-20`. Its `w3-ci.yml` is stored there as `archive/w3-local-draft/w3-ci.yml`, because of gate 1.
