// Quiet-hours and eligibility helpers (M031).
// Offers must preserve a fair response opportunity: no first contact inside
// the patient's local quiet hours. Eligibility matches hard constraints
// first; alternates widen the pool without overriding hard constraints.

export interface QuietHours {
  /** Local HH:MM bounds, e.g. start "21:00", end "08:00" (may wrap midnight). */
  startLocal: string;
  endLocal: string;
}

/** True when the given UTC instant falls inside local quiet hours. */
export function isQuietHourUtc(
  instantUtc: string,
  timeZone: string,
  quiet: QuietHours,
): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instantUtc));
  const get = (t: string): string =>
    parts.find((p) => p.type === t)?.value ?? "00";
  const local = `${get("hour")}:${get("minute")}`;
  if (quiet.startLocal <= quiet.endLocal) {
    return local >= quiet.startLocal && local < quiet.endLocal;
  }
  return local >= quiet.startLocal || local < quiet.endLocal;
}

export interface SlotCandidate {
  clinicianId: string;
  locationId: string;
}

export interface EligibilityResult {
  eligible: boolean;
  matchedHard: boolean;
  matchedAlternate: boolean;
  reasons: string[];
}

/**
 * Hard required sets must match when non-empty. Alternate sets widen the
 * pool: a candidate matching only an alternate is eligible but flagged so
 * matching can prefer hard-constraint fits first.
 */
export function checkEligibility(
  candidate: SlotCandidate,
  requiredClinicians: readonly string[],
  alternateClinicians: readonly string[],
  requiredLocations: readonly string[],
  alternateLocations: readonly string[],
): EligibilityResult {
  const reasons: string[] = [];
  const clinHard =
    requiredClinicians.length === 0 ||
    requiredClinicians.includes(candidate.clinicianId);
  const locHard =
    requiredLocations.length === 0 ||
    requiredLocations.includes(candidate.locationId);
  if (!clinHard) reasons.push("clinician-hard-constraint-mismatch");
  if (!locHard) reasons.push("location-hard-constraint-mismatch");
  if (!clinHard || !locHard) {
    return { eligible: false, matchedHard: false, matchedAlternate: false, reasons };
  }
  const clinAlt =
    alternateClinicians.length > 0 &&
    alternateClinicians.includes(candidate.clinicianId);
  const locAlt =
    alternateLocations.length > 0 && alternateLocations.includes(candidate.locationId);
  const matchedHard =
    (requiredClinicians.length > 0 || requiredLocations.length > 0) &&
    !clinAlt &&
    !locAlt;
  const matchedAlternate = clinAlt || locAlt;
  if (matchedAlternate) reasons.push("matched-acceptable-alternate");
  else reasons.push("matched-hard-constraints");
  return { eligible: true, matchedHard, matchedAlternate, reasons };
}
