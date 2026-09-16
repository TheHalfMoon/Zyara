// Governed aggregate analytics and partner APIs (M057).
// Aggregates below the k-anonymity threshold are suppressed. Partner
// tokens are purpose-scoped with rate limits. Every export is audited.
// Patient free text never enters analytics payloads. Analytics reads
// require M051 analytics consent.

import { isConsented, type ConsentGrant } from "@zyara/consent-boundaries";

export const K_ANONYMITY_THRESHOLD = 5;

export interface AggregateCell {
  key: string;
  count: number;
  freeText: string | null;
}

export interface ReleasedCell {
  key: string;
  count: number | null;
  suppressed: boolean;
}

export function releaseAggregates(
  cells: readonly AggregateCell[],
): ReleasedCell[] {
  return cells.map((c) => {
    if (c.freeText !== null) {
      return { key: c.key, count: null, suppressed: true };
    }
    if (c.count < K_ANONYMITY_THRESHOLD) {
      return { key: c.key, count: null, suppressed: true };
    }
    return { key: c.key, count: c.count, suppressed: false };
  });
}

export interface PartnerToken {
  tokenId: string;
  purposes: string[];
  rateLimitPerMin: number;
}

export function tokenAllowed(
  token: PartnerToken,
  purpose: string,
): boolean {
  return token.purposes.includes(purpose);
}

export class RateLimiter {
  private hits = new Map<string, number[]>();
  allow(tokenId: string, limit: number, nowMs: number): boolean {
    const window = this.hits.get(tokenId) ?? [];
    const fresh = window.filter((t) => nowMs - t < 60_000);
    if (fresh.length >= limit) {
      this.hits.set(tokenId, fresh);
      return false;
    }
    fresh.push(nowMs);
    this.hits.set(tokenId, fresh);
    return true;
  }
}

export interface ExportAudit {
  atUtc: string;
  tokenId: string;
  purpose: string;
  cells: number;
  suppressed: number;
}

export function analyticsAllowed(
  grants: readonly ConsentGrant[],
  nowUtc: string,
): boolean {
  return isConsented(grants, "analytics", nowUtc);
}
