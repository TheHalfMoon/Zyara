import { isSupportedLocale } from "@zyara/domain";
import { NEARBY_PLACES, directionsUrl } from "../discovery-data";

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  const ar = active === "ar";

  return (
    <main className="zyara-shell" lang={active} dir={ar ? "rtl" : "ltr"}>
      <nav className="zyara-nav" aria-label="Primary navigation">
        <a className="zyara-brand" href={`/${active}`} aria-label="Zyara start">
          <span className="zyara-mark" aria-hidden="true">Z</span>
          <span className="zyara-wordmark">Zyara</span>
        </a>
        <div className="zyara-nav-links">
          <a className="zyara-nav-link" href={`/${active}/search`}>{ar ? "القائمة" : "List"}</a>
          <span className="zyara-location-chip">⌖ {ar ? "الرياض" : "Riyadh"}</span>
        </div>
      </nav>

      <section className="zyara-page">
        <header className="zyara-page-head">
          <span className="zyara-eyebrow">{ar ? "خريطة الرعاية" : "Care map"}</span>
          <h1 className="zyara-page-title">{ar ? "اعرف ما حولك قبل أن تتحرك." : "Know what’s around you before you go."}</h1>
          <p className="zyara-page-subtitle">
            {ar
              ? "المسافة، وقت القيادة، حالة الدوام، وأقرب موعد في مكان واحد. القائمة أسفل الخريطة هي البديل الكامل القابل للوصول."
              : "Distance, drive time, opening status, and next availability in one view. The list below remains the complete accessible fallback."}
          </p>
        </header>

        <div className="zyara-map-panel" style={{ minHeight: 720, position: "relative", top: "auto" }} role="application" aria-label="Nearby care map" data-renderer="maplibre" data-fallback="list">
          <div className="zyara-map-grid" aria-hidden="true" />
          <div className="zyara-map-road" aria-hidden="true" />
          <div className="zyara-map-road second" aria-hidden="true" />
          <div className="zyara-map-road third" aria-hidden="true" />
          <span className="zyara-pin p1" aria-hidden="true"><span>4.8</span></span>
          <span className="zyara-pin p2" aria-hidden="true"><span>4.7</span></span>
          <span className="zyara-pin p3" aria-hidden="true"><span>4.9</span></span>
          <span className="zyara-pin p4" aria-hidden="true"><span>4.6</span></span>
          <span className="zyara-you" aria-label="Your approximate location" />
          <div className="zyara-map-toolbar">
            <a className="zyara-secondary" href={`/${active}/search`}>{ar ? "☰ القائمة" : "☰ List"}</a>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="zyara-location-chip">⌖ {ar ? "موقعي التقريبي" : "Approximate location"}</span>
              <button className="zyara-secondary" type="button">{ar ? "بحث في هذه المنطقة" : "Search this area"}</button>
            </div>
          </div>
          <div className="zyara-map-place">
            <article className="zyara-floating-card">
              <div className="zyara-place-thumb" aria-hidden="true">CARE</div>
              <div>
                <h3>{NEARBY_PLACES[0].name}</h3>
                <div className="zyara-meta">
                  <span>★ {NEARBY_PLACES[0].rating} ({NEARBY_PLACES[0].reviews})</span>
                  <span>{NEARBY_PLACES[0].distanceKm} km · {NEARBY_PLACES[0].driveMinutes} min</span>
                  <span className="zyara-positive">● {ar ? "مفتوح الآن" : "Open now"}</span>
                  <span>{ar ? "يغلق" : "Closes"} {NEARBY_PLACES[0].closesAt}</span>
                </div>
              </div>
              <a className="zyara-primary" href={directionsUrl(NEARBY_PLACES[0])} target="_blank" rel="noreferrer">{ar ? "الاتجاهات" : "Directions"} ↗</a>
            </article>
          </div>
        </div>

        <section className="zyara-section" aria-labelledby="map-list-heading">
          <div className="zyara-list-heading">
            <h2 id="map-list-heading">{ar ? "الأماكن الظاهرة على الخريطة" : "Places on this map"}</h2>
            <span>{NEARBY_PLACES.length} {ar ? "أماكن تجريبية" : "preview places"}</span>
          </div>
          <div className="zyara-results" aria-label="branch-list">
            {NEARBY_PLACES.map((place) => (
              <article className="zyara-card" key={place.id}>
                <div className="zyara-place-thumb" aria-hidden="true">{place.kind.toUpperCase()}</div>
                <div>
                  <div className="zyara-card-top">
                    <div>
                      <div className="zyara-card-kicker">{place.area}</div>
                      <h3>{place.name}</h3>
                    </div>
                    <span className="zyara-distance">⌖ {place.distanceKm} km · {place.driveMinutes} min</span>
                  </div>
                  <div className="zyara-meta"><span>★ {place.rating} ({place.reviews})</span><span>{place.address}</span></div>
                  <div className="zyara-availability">
                    <span className="zyara-positive">● {ar ? "مفتوح الآن" : "Open now"}</span>
                    <span>{ar ? "يغلق" : "Closes"} {place.closesAt}</span>
                    <span>{ar ? "أقرب موعد" : "Next"}: {place.nextAvailable}</span>
                  </div>
                  <div className="zyara-card-actions">
                    <a className="zyara-secondary" href={`/${active}/profiles/${place.id}`}>{ar ? "التفاصيل" : "Details"}</a>
                    <a className="zyara-secondary" href={directionsUrl(place)} target="_blank" rel="noreferrer">{ar ? "الاتجاهات" : "Directions"} ↗</a>
                    <a className="zyara-primary" href={`/${active}/book?branch=${place.id}`}>{ar ? "احجز" : "Book"}</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <p className="zyara-demo-note">Preview map uses synthetic provider fixtures. Precise location permission is optional; without it, Zyara can still show care by city or area without user-distance claims.</p>
      </section>
    </main>
  );
}
