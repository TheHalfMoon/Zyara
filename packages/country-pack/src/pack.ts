// Evidence-backed international country pack, repository part (M058).
// A pack declares locales, timezone, quiet hours, holidays, escalation,
// consent purposes and evidence pointers. The validator enforces
// completeness. Launch readiness is never claimed here: real expansion
// evidence belongs to M060 and stays pending.

export interface CountryPack {
  countryCode: string;
  locales: string[];
  rtl: boolean;
  timeZone: string;
  quietHours: { startLocal: string; endLocal: string };
  holidays: string[];
  escalation: string;
  consentPurposes: string[];
  evidenceRefs: string[];
}

export function validatePack(
  pack: CountryPack,
): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!pack.countryCode) missing.push("countryCode");
  if (pack.locales.length === 0) missing.push("locales");
  if (!pack.timeZone) missing.push("timeZone");
  if (!pack.quietHours?.startLocal || !pack.quietHours?.endLocal) missing.push("quietHours");
  if (!pack.escalation) missing.push("escalation");
  if (pack.consentPurposes.length === 0) missing.push("consentPurposes");
  if (pack.evidenceRefs.length === 0) missing.push("evidenceRefs");
  return { complete: missing.length === 0, missing };
}

export interface LaunchReadiness {
  packComplete: boolean;
  realExpansionEvidence: boolean;
  launchReady: boolean;
  claim: string;
}

/** Repository honesty: no launch readiness without real evidence. */
export function assessLaunchReadiness(
  pack: CountryPack,
  realExpansionEvidence: boolean,
): LaunchReadiness {
  const { complete } = validatePack(pack);
  const launchReady = complete && realExpansionEvidence;
  return {
    packComplete: complete,
    realExpansionEvidence,
    launchReady,
    claim: launchReady
      ? "Launch readiness supported by pack plus real evidence."
      : "NOT launch-ready: repository pack is preparation only; real expansion evidence pending (M060).",
  };
}
