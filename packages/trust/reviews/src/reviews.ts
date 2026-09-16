// Verified experience reviews and replies (M022). English only.
//
// One patient/visit review gated by M021 attendance eligibility. Dimensions
// cover practitioner/facility experience, never clinical outcomes. Public
// projection is anonymous and redacted; internal identity stays private.
// Providers can reply but cannot remove compliant reviews and cannot expose
// private care facts. Moderation quarantines unsafe text with appeal.

export type ReviewDimension = "punctuality" | "communication" | "facility" | "cleanliness";
export type ReviewState = "pending_moderation" | "published" | "quarantined" | "withdrawn";
export type ActorKind = "patient" | "provider" | "moderator" | "system";

export interface Review {
  id: string;
  tenantId: string;
  appointmentId: string;
  patientId: string;
  practitionerId: string;
  ratings: Record<ReviewDimension, 1 | 2 | 3 | 4 | 5>;
  text: string;
  state: ReviewState;
  version: number;
  history: Array<{ version: number; text: string; atUtc: string }>;
  reply: { text: string; atUtc: string } | null;
}

export interface ReviewStore {
  byId: Map<string, Review>;
  byAppointment: Map<string, string>;
  invited: Set<string>;
  audit: string[];
}

/** Every eligible visit is invited, without sentiment gating. */
export function inviteEligible(store: ReviewStore, appointmentId: string): boolean {
  if (store.invited.has(appointmentId)) return false;
  store.invited.add(appointmentId);
  store.audit.push(`INVITED ${appointmentId}`);
  return true;
}

const SENSITIVE_TOKENS = [
  "diagnosis", "prescription", "national-id", "phone", "+966",
  "dependent", "intake",
];

/** Public text must not carry clinical facts, identifiers, or contacts. */
export function redactForPublic(text: string): { safe: boolean; redacted: string } {
  let redacted = text;
  let safe = true;
  for (const token of SENSITIVE_TOKENS) {
    if (redacted.toLowerCase().includes(token)) {
      safe = false;
      redacted = redacted.replace(new RegExp(token, "gi"), "[redacted]");
    }
  }
  if (redacted.length > 1000) {
    safe = false;
    redacted = `${redacted.slice(0, 1000)}…`;
  }
  return { safe, redacted };
}

/**
 * Submit one review per appointment. Duplicate submissions replay the
 * existing review id without creating a second review.
 */
export function submitReview(
  store: ReviewStore,
  input: {
    id: string; tenantId: string; appointmentId: string; patientId: string;
    practitionerId: string; ratings: Review["ratings"]; text: string;
    eligible: boolean; atUtc: string;
  },
): { ok: boolean; code: string; reviewId?: string } {
  if (!input.eligible) return { ok: false, code: "REVIEW_NOT_ELIGIBLE" };
  const dup = store.byAppointment.get(input.appointmentId);
  if (dup) {
    store.audit.push(`DUPLICATE ${input.appointmentId}`);
    return { ok: false, code: "DUPLICATE_VISIT_REVIEW", reviewId: dup };
  }
  if (input.text.length > 1000) return { ok: false, code: "REVIEW_TEXT_TOO_LONG" };
  const { safe } = redactForPublic(input.text);
  const review: Review = {
    id: input.id, tenantId: input.tenantId, appointmentId: input.appointmentId,
    patientId: input.patientId, practitionerId: input.practitionerId,
    ratings: { ...input.ratings }, text: input.text,
    state: safe ? "pending_moderation" : "quarantined",
    version: 1, history: [{ version: 1, text: input.text, atUtc: input.atUtc }],
    reply: null,
  };
  store.byId.set(review.id, review);
  store.byAppointment.set(input.appointmentId, review.id);
  store.audit.push(`SUBMITTED ${review.id}`);
  return { ok: true, code: safe ? "REVIEW_QUEUED" : "REVIEW_QUARANTINED", reviewId: review.id };
}

/** Patient edit keeps full history; moderation re-checks the new text. */
export function editReview(
  store: ReviewStore,
  reviewId: string,
  patientId: string,
  newText: string,
  atUtc: string,
): { ok: boolean; code: string } {
  const review = store.byId.get(reviewId);
  if (!review || review.patientId !== patientId) return { ok: false, code: "REVIEW_FORBIDDEN" };
  if (review.state === "withdrawn") return { ok: false, code: "REVIEW_WITHDRAWN" };
  if (newText.length > 1000) return { ok: false, code: "REVIEW_TEXT_TOO_LONG" };
  review.version += 1;
  review.text = newText;
  review.history.push({ version: review.version, text: newText, atUtc });
  const { safe } = redactForPublic(newText);
  review.state = safe ? "pending_moderation" : "quarantined";
  store.audit.push(`EDITED ${reviewId} v${review.version}`);
  return { ok: true, code: "REVIEW_EDIT_QUEUED" };
}

/**
 * Moderation decision by an independent moderator. Providers can never
 * remove or moderate reviews of their own service: the provider actor is
 * rejected here regardless of review sentiment.
 */
export function moderateReview(
  store: ReviewStore,
  reviewId: string,
  actor: ActorKind,
  decision: "publish" | "quarantine" | "withdraw_unsafe",
): { ok: boolean; code: string } {
  if (actor === "provider") return { ok: false, code: "PROVIDER_MODERATION_DENIED" };
  if (actor !== "moderator") return { ok: false, code: "REVIEW_FORBIDDEN" };
  const review = store.byId.get(reviewId);
  if (!review) return { ok: false, code: "REVIEW_UNKNOWN" };
  if (decision === "publish") {
    const { safe, redacted } = redactForPublic(review.text);
    if (!safe) return { ok: false, code: "REVIEW_NEEDS_REDACTION" };
    review.text = redacted;
    review.state = "published";
  } else if (decision === "quarantine") {
    review.state = "quarantined";
  } else {
    review.state = "withdrawn";
  }
  store.audit.push(`MODERATED ${reviewId} ${decision}`);
  return { ok: true, code: "MODERATED" };
}

/**
 * Protected provider reply. The reply is screened for private care facts
 * before publication; a violating reply is rejected, never published.
 */
export function replyToReview(
  store: ReviewStore,
  reviewId: string,
  practitionerId: string,
  replyText: string,
  atUtc: string,
): { ok: boolean; code: string } {
  const review = store.byId.get(reviewId);
  if (!review || review.practitionerId !== practitionerId) return { ok: false, code: "REVIEW_FORBIDDEN" };
  if (replyText.length > 500) return { ok: false, code: "REPLY_TOO_LONG" };
  const { safe } = redactForPublic(replyText);
  if (!safe) return { ok: false, code: "REPLY_EXPOSES_PRIVATE_FACTS" };
  review.reply = { text: replyText, atUtc };
  store.audit.push(`REPLIED ${reviewId}`);
  return { ok: true, code: "REPLY_PUBLISHED" };
}

/** Anonymous public projection: no patient id, redacted text, dimensions only. */
export function publicProjection(review: Review): {
  id: string; ratings: Record<ReviewDimension, number>; text: string; reply: string | null;
} {
  const { redacted } = redactForPublic(review.text);
  return {
    id: review.id,
    ratings: { ...review.ratings },
    text: redacted,
    reply: review.reply ? redactForPublic(review.reply.text).redacted : null,
  };
}

/**
 * Low-count aggregates: means are reported only above the minimum review
 * threshold; below it only the count is shown to avoid de-anonymization.
 */
export function aggregateRatings(
  reviews: Review[],
  minCount: number,
): { count: number; means: Record<ReviewDimension, number> | null } {
  const published = reviews.filter((r) => r.state === "published");
  if (published.length < minCount) return { count: published.length, means: null };
  const dims: ReviewDimension[] = ["punctuality", "communication", "facility", "cleanliness"];
  const means = {} as Record<ReviewDimension, number>;
  for (const d of dims) {
    means[d] = Math.round((published.reduce((s, r) => s + r.ratings[d], 0) / published.length) * 10) / 10;
  }
  return { count: published.length, means };
}

export const REVIEW_LOCALES = ["ar", "en", "fr", "de", "es"] as const;

export function moderationGuidance(locale: string): string {
  const table: Record<string, string> = {
    ar: "انشر التجارب المتوافقة بما فيها السلبية. احجب النص غير الآمن مع إتاحة الاستئناف.",
    en: "Publish compliant experiences including negative ones. Quarantine unsafe text with appeal available.",
    fr: "Publiez les expériences conformes, y compris négatives. Mettez en quarantaine les textes dangereux avec appel possible.",
    de: "Veröffentlichen Sie konforme Erfahrungen, auch negative. Stellen Sie unsichere Texte unter Quarantäne mit Widerspruchsmöglichkeit.",
    es: "Publique experiencias conformes, incluidas las negativas. Ponga en cuarentena el texto inseguro con apelación disponible.",
  };
  return table[locale] ?? table.en;
}

/** Counts only: invitations, moderation latency inputs, appeals, freshness. */
export function telemetryForReviews(input: {
  invited: number; published: number; quarantined: number; appeals: number;
}): Record<string, number> {
  return { ...input };
}
