import { isSupportedLocale } from "@zyara/domain";
import { translate } from "@zyara/i18n";

// Synthetic branch profile (M012). Verified fields show exact scope +
// freshness; insurer acceptance carries a caveat; booking mode is labeled.
// No precise-location permission is required to view this page.
const PROFILES: Record<string, { ar: string; en: string; scope: string | null; observed: string; insurer: string | null; mode: string }> = {
  b1: {
    ar: "عيادة العليا", en: "Olaya Clinic",
    scope: "commercial registration", observed: "2026-09-01",
    insurer: "TAWUNIYA gold — confirm coverage with the branch",
    mode: "request",
  },
};

export default async function ProfilePage({ params }: { params: Promise<{ locale: string; branchId: string }> }) {
  const { locale, branchId } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  const p = PROFILES[branchId];
  if (!p) return <main><h1>{translate(active, "common.retry")}</h1></main>;
  return (
    <main>
      <h1>{active === "ar" ? p.ar : p.en}</h1>
      {p.scope ? (
        <p>Verified: {p.scope} (observed {p.observed})</p>
      ) : (
        <p>Unverified — scope unknown</p>
      )}
      {p.insurer ? <p>{p.insurer}</p> : <p>Insurance acceptance unknown — not guaranteed</p>}
      <p>Booking: {p.mode}</p>
      <ul aria-label="profile-actions">
        <li><button type="button">Directions</button></li>
        <li><button type="button">Call</button></li>
        <li><button type="button">{translate(active, "common.confirm")}</button></li>
      </ul>
    </main>
  );
}
