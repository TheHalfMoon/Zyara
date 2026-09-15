import { isSupportedLocale } from "@zyara/domain";
import { translate } from "@zyara/i18n";

// Synthetic map/list discovery (M012). The LIST is the primary accessible
// surface and offers every map action; the map is a renderer (MapLibre in
// production) with list fallback on tile outage. Location is optional:
// without it, all branches list without distances.
export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  return (
    <main>
      <h1>{translate(active, "common.confirm")}</h1>
      <div role="application" aria-label="branch-map" data-renderer="maplibre" data-fallback="list">
        Map renderer placeholder — list below is authoritative.
      </div>
      <ul aria-label="branch-list">
        <li>
          <h2>{active === "ar" ? "عيادة العليا" : "Olaya Clinic"}</h2>
          <button type="button">Directions</button>
          <button type="button">Call</button>
          <button type="button">{translate(active, "common.confirm")}</button>
        </li>
      </ul>
    </main>
  );
}
