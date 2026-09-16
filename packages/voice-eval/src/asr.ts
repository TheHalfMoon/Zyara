// Private and approved-cloud ASR evaluation (M044).
// Synthetic fixture corpus across five locales (ar, ar-EG, en, ur, tl —
// Arabic RTL first). Word-error rate is measured per engine per locale.
// Privacy grades separate on-device/private from approved-cloud; cloud
// engines require a recorded data-flow. Engines pass only with both
// accuracy (WER <= threshold) and privacy evidence. Transcripts never
// become clinical truth (see M045 confirmation).

export type EvalLocale = "ar" | "ar-EG" | "en" | "ur" | "tl";

export const EVAL_LOCALES: readonly EvalLocale[] = ["ar", "ar-EG", "en", "ur", "tl"];

export interface FixtureUtterance {
  id: string;
  locale: EvalLocale;
  referenceText: string;
  /** True when the utterance carries a critical value (date/dose/name). */
  critical: boolean;
}

export interface EngineHypothesis {
  engineId: string;
  utteranceId: string;
  hypothesisText: string;
}

export function wordErrorRate(reference: string, hypothesis: string): number {
  const ref = reference.trim().split(/\s+/).filter(Boolean);
  const hyp = hypothesis.trim().split(/\s+/).filter(Boolean);
  if (ref.length === 0) return hyp.length === 0 ? 0 : 1;
  const prev = new Array<number>(hyp.length + 1);
  const cur = new Array<number>(hyp.length + 1);
  for (let j = 0; j <= hyp.length; j++) prev[j] = j;
  for (let i = 1; i <= ref.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= hyp.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= hyp.length; j++) prev[j] = cur[j];
  }
  return prev[hyp.length] / ref.length;
}

export type PrivacyGrade =
  | "on-device"
  | "private-cloud"
  | "approved-cloud-with-flow"
  | "ungraded";

export interface EngineRecord {
  engineId: string;
  privacy: PrivacyGrade;
  /** Required when privacy is approved-cloud-with-flow. */
  dataFlowRef: string | null;
  werThreshold: number;
}

export function gradeEngine(
  record: EngineRecord,
  wers: readonly number[],
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (record.privacy === "ungraded") reasons.push("missing-privacy-grade");
  if (record.privacy === "approved-cloud-with-flow" && !record.dataFlowRef) {
    reasons.push("missing-data-flow-record");
  }
  const worst = Math.max(...wers, 0);
  if (worst > record.werThreshold) {
    reasons.push(`wer-above-threshold:${worst.toFixed(3)}`);
  }
  return { pass: reasons.length === 0, reasons };
}

export function scoreEngine(
  fixtures: readonly FixtureUtterance[],
  hypotheses: readonly EngineHypothesis[],
  record: EngineRecord,
): { perLocale: Record<string, number>; criticalFlagged: string[]; gate: { pass: boolean; reasons: string[] } } {
  const byId = new Map(hypotheses.map((h) => [h.utteranceId, h.hypothesisText]));
  const perLocale: Record<string, number[]> = {};
  const criticalFlagged: string[] = [];
  for (const f of fixtures) {
    const hyp = byId.get(f.id) ?? "";
    const wer = wordErrorRate(f.referenceText, hyp);
    if (!perLocale[f.locale]) perLocale[f.locale] = [];
    perLocale[f.locale].push(wer);
    if (f.critical) criticalFlagged.push(f.id);
  }
  const avg: Record<string, number> = {};
  for (const [locale, vals] of Object.entries(perLocale)) {
    avg[locale] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  const gate = gradeEngine(record, Object.values(avg));
  return { perLocale: avg, criticalFlagged, gate };
}
