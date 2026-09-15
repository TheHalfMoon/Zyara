// Search contract (M010): versioned query/result envelope, ranking input
// allowlist, explanation contract. Commercial tier is NEVER a ranking input.

export const SEARCH_CONTRACT_VERSION = 1;

export type SortMode = "relevant" | "soonest" | "nearest";

export interface SearchQuery {
  version: number;
  locale: "ar" | "en" | "fr" | "de" | "es";
  text: string;
  specialty?: string;
  service?: string;
  insurer?: string;
  branchId?: string;
  near?: { lat: number; lng: number; radiusKm: number };
  sort: SortMode;
}

// Ranking input allowlist: ONLY these signals may influence organic score.
export const RANKING_INPUT_ALLOWLIST = [
  "text_match",
  "alias_match",
  "specialty_match",
  "service_match",
  "insurer_match",
  "distance_km",
  "freshness_days",
  "verification_scope",
] as const;

export interface RankedResult {
  docId: string;
  score: number;
  // Explanation references allowlist inputs only.
  explanation: { signal: (typeof RANKING_INPUT_ALLOWLIST)[number]; weight: number }[];
  matchedAlias: boolean;
  distanceKm: number | null;
  insurerKnown: boolean;
}

export interface SearchResponse {
  version: number;
  results: RankedResult[];
  relaxedFilters: boolean;
  zeroResultHelp: boolean;
}
