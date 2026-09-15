// Structured search and transparent ranking (M011).
// ONLY approved public projections are indexed. Ranking uses the contract
// allowlist; commercial tier is not a signal and cannot enter the score.
// Unknown insurance is reported as unknown, never as covered.
// Filter relaxation happens ONLY on explicit patient choice (allowRelax).
// Symptom navigation is gated behind M003 clinical policy (default OFF).

import type { SearchQuery, SearchResponse, RankedResult, SortMode } from "@zyara/search-contract";

export interface PublicProjection {
  docId: string;
  branchId: string;
  names: Record<string, string>;
  specialty: string;
  service: string;
  insurer: string | null;
  languages: string[];
  accessibility: string[];
  verifiedScope: string | null;
  withdrawn: boolean;
  expired: boolean;
  freshnessDays: number;
  lat: number;
  lng: number;
  nextAvailableIso: string | null;
}

export interface SearchOptions {
  allowRelax: boolean;
  symptomNavigationEnabled: boolean;
}

function textMatch(projection: PublicProjection, text: string): { score: number; alias: boolean } {
  const q = text.toLowerCase();
  let score = 0;
  let alias = false;
  for (const name of Object.values(projection.names)) {
    if (name.toLowerCase().includes(q) && q.length > 0) {
      score += 3;
      alias = true;
    }
  }
  if (projection.specialty.toLowerCase().includes(q)) score += 2;
  if (projection.service.toLowerCase().includes(q)) score += 1;
  return { score, alias };
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  return Math.hypot(aLat - bLat, aLng - bLng) * 111;
}

export function search(
  index: PublicProjection[],
  query: SearchQuery,
  opts: SearchOptions,
): SearchResponse {
  if (query.version !== 1) throw new Error("SEARCH_CONTRACT_VERSION");
  // Curated symptom navigation only under M003 policy; default deny.
  if (!opts.symptomNavigationEnabled && /pain|fever|symptom|cough|ألم|حمى/i.test(query.text)) {
    return { version: 1, results: [], relaxedFilters: false, zeroResultHelp: true };
  }
  // Hard constraints first (specialty/service/branch/geo/insurer-as-filter).
  let candidates = index.filter((p) => !p.withdrawn && !p.expired);
  if (query.specialty) candidates = candidates.filter((p) => p.specialty === query.specialty);
  if (query.service) candidates = candidates.filter((p) => p.service === query.service);
  if (query.branchId) candidates = candidates.filter((p) => p.branchId === query.branchId);
  if (query.near) {
    candidates = candidates.filter(
      (p) => distanceKm(p.lat, p.lng, query.near!.lat, query.near!.lng) <= query.near!.radiusKm,
    );
  }
  let relaxedFilters = false;
  if (candidates.length === 0 && opts.allowRelax) {
    // Patient explicitly chose relaxation: drop geo, keep clinical constraints.
    relaxedFilters = true;
    candidates = index.filter((p) => !p.withdrawn && !p.expired);
    if (query.specialty) candidates = candidates.filter((p) => p.specialty === query.specialty);
    if (query.service) candidates = candidates.filter((p) => p.service === query.service);
  }
  const results: RankedResult[] = candidates.map((p) => {
    const { score: textScore, alias } = textMatch(p, query.text);
    let score = textScore;
    const explanation: RankedResult["explanation"] = [];
    if (textScore > 0) explanation.push({ signal: alias ? "alias_match" : "text_match", weight: textScore });
    if (query.specialty && p.specialty === query.specialty) {
      score += 2;
      explanation.push({ signal: "specialty_match", weight: 2 });
    }
    if (query.service && p.service === query.service) {
      score += 1;
      explanation.push({ signal: "service_match", weight: 1 });
    }
    let dist: number | null = null;
    if (query.near) {
      dist = distanceKm(p.lat, p.lng, query.near.lat, query.near.lng);
      score += Math.max(0, 2 - dist / 5);
      explanation.push({ signal: "distance_km", weight: 1 });
    }
    if (p.verifiedScope) {
      score += 0.5;
      explanation.push({ signal: "verification_scope", weight: 0.5 });
    }
    score -= p.freshnessDays / 100;
    explanation.push({ signal: "freshness_days", weight: -p.freshnessDays / 100 });
    const insurerKnown = query.insurer ? p.insurer === query.insurer : p.insurer !== null;
    if (query.insurer && p.insurer === query.insurer) {
      score += 1;
      explanation.push({ signal: "insurer_match", weight: 1 });
    }
    return { docId: p.docId, score, explanation, matchedAlias: alias, distanceKm: dist, insurerKnown };
  });
  const sort: SortMode = query.sort;
  results.sort((a, b) => {
    if (sort === "nearest") return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    return b.score - a.score;
  });
  return { version: 1, results: results.slice(0, 20), relaxedFilters, zeroResultHelp: results.length === 0 };
}

export function indexFreshness(index: PublicProjection[]): { docs: number; maxFreshnessDays: number } {
  return { docs: index.length, maxFreshnessDays: Math.max(0, ...index.map((p) => p.freshnessDays)) };
}
