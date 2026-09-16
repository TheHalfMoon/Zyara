// Expiring offers and safe cancellation refill (M032).
// One offer cannot allocate one unit twice. Acceptance after expiry keeps
// the original booking. Replacement releases the later booking only after
// the earlier one is committed. No-hold sources get honest availability
// invitations, never fake holds.

import { isQuietHourUtc, type QuietHours } from "./fairness.js";

export type OfferState =
  | "pending"
  | "accepted"
  | "expired"
  | "declined"
  | "consumed";

export interface Offer {
  id: string;
  tenantId: string;
  enrollmentId: string;
  /** Unit being offered (slot/hold id). One unit maps to at most one live offer. */
  unitId: string;
  /** True when backed by a real hold; false means honest invitation only. */
  holdBacked: boolean;
  holdId: string | null;
  originalAppointmentId: string;
  offeredStartUtc: string;
  offeredEndUtc: string;
  expiresAtUtc: string;
  firstContactAtUtc: string;
  state: OfferState;
}

export interface AcceptOutcome {
  ok: boolean;
  code:
    | "ACCEPTED"
    | "OFFER_EXPIRED"
    | "OFFER_NOT_PENDING"
    | "UNIT_ALREADY_ALLOCATED"
    | "LATE_ACCEPT_ORIGINAL_RETAINED";
  /** Replacement booking id when accepted; null otherwise. */
  replacementBookingId: string | null;
  originalRetained: boolean;
}

export interface OfferStore {
  liveOfferForUnit(unitId: string): Offer | null;
  get(id: string): Offer | null;
  save(offer: Offer): void;
}

export class MemoryOfferStore implements OfferStore {
  private offers = new Map<string, Offer>();
  liveOfferForUnit(unitId: string): Offer | null {
    for (const o of this.offers.values()) {
      if (o.unitId === unitId && o.state === "pending") return o;
    }
    return null;
  }
  get(id: string): Offer | null {
    return this.offers.get(id) ?? null;
  }
  save(offer: Offer): void {
    this.offers.set(offer.id, offer);
  }
}

export interface CreateOfferInput {
  id: string;
  tenantId: string;
  enrollmentId: string;
  unitId: string;
  holdBacked: boolean;
  holdId: string | null;
  originalAppointmentId: string;
  offeredStartUtc: string;
  offeredEndUtc: string;
  /** Requested first-contact instant; deferred past quiet hours. */
  firstContactAtUtc: string;
  /** Offer TTL in minutes from effective first contact. */
  ttlMin: number;
  timeZone: string;
  quiet: QuietHours;
}

export function effectiveFirstContact(
  requestedUtc: string,
  timeZone: string,
  quiet: QuietHours,
): string {
  let t = new Date(requestedUtc).getTime();
  // Defer in 5-minute steps past quiet hours (bounded: max 24h).
  for (let i = 0; i < 288; i++) {
    const iso = new Date(t).toISOString();
    if (!isQuietHourUtc(iso, timeZone, quiet)) return iso;
    t += 5 * 60 * 1000;
  }
  return new Date(t).toISOString();
}

export function createOffer(
  store: OfferStore,
  input: CreateOfferInput,
): Offer | { error: string } {
  if (store.liveOfferForUnit(input.unitId)) {
    return { error: "UNIT_ALREADY_OFFERED" };
  }
  if (input.holdBacked && !input.holdId) {
    return { error: "HOLD_BACKED_REQUIRES_HOLD_ID" };
  }
  const first = effectiveFirstContact(
    input.firstContactAtUtc,
    input.timeZone,
    input.quiet,
  );
  const expires = new Date(
    new Date(first).getTime() + input.ttlMin * 60 * 1000,
  ).toISOString();
  const offer: Offer = {
    id: input.id,
    tenantId: input.tenantId,
    enrollmentId: input.enrollmentId,
    unitId: input.unitId,
    holdBacked: input.holdBacked,
    holdId: input.holdId,
    originalAppointmentId: input.originalAppointmentId,
    offeredStartUtc: input.offeredStartUtc,
    offeredEndUtc: input.offeredEndUtc,
    expiresAtUtc: expires,
    firstContactAtUtc: first,
    state: "pending",
  };
  store.save(offer);
  return offer;
}

export interface CommitReplacement {
  (offer: Offer, nowUtc: string): string | null;
}

/**
 * Accept an offer. Late or non-pending accepts retain the original booking
 * and allocate nothing. Double allocation is refused even under races: the
 * store is rechecked and commit failure retains the original.
 */
export function acceptOffer(
  store: OfferStore,
  offerId: string,
  nowUtc: string,
  commit: CommitReplacement,
): AcceptOutcome {
  const offer = store.get(offerId);
  if (!offer) {
    return {
      ok: false,
      code: "OFFER_NOT_PENDING",
      replacementBookingId: null,
      originalRetained: true,
    };
  }
  if (offer.state !== "pending") {
    return {
      ok: false,
      code: "OFFER_NOT_PENDING",
      replacementBookingId: null,
      originalRetained: true,
    };
  }
  if (nowUtc >= offer.expiresAtUtc) {
    store.save({ ...offer, state: "expired" });
    return {
      ok: false,
      code: "OFFER_EXPIRED",
      replacementBookingId: null,
      originalRetained: true,
    };
  }
  const competing = store.liveOfferForUnit(offer.unitId);
  if (competing && competing.id !== offer.id) {
    return {
      ok: false,
      code: "UNIT_ALREADY_ALLOCATED",
      replacementBookingId: null,
      originalRetained: true,
    };
  }
  const replacementId = commit(offer, nowUtc);
  if (!replacementId) {
    // Ambiguous commit outcome: keep offer pending, retain original, no retry here.
    return {
      ok: false,
      code: "UNIT_ALREADY_ALLOCATED",
      replacementBookingId: null,
      originalRetained: true,
    };
  }
  store.save({ ...offer, state: "consumed" });
  return {
    ok: true,
    code: "ACCEPTED",
    replacementBookingId: replacementId,
    originalRetained: false,
  };
}

export function expireOffers(store: MemoryOfferStore, offers: Offer[], nowUtc: string): Offer[] {
  return offers.map((o) => {
    if (o.state === "pending" && nowUtc >= o.expiresAtUtc) {
      const expired = { ...o, state: "expired" as const };
      store.save(expired);
      return expired;
    }
    return o;
  });
}
