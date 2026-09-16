import { isSupportedLocale } from "@zyara/domain";
import { NEARBY_DOCTORS, NEARBY_PLACES, directionsUrl } from "../discovery-data";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ text?: string; type?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const active = isSupportedLocale(locale) ? locale : "ar";
  const ar = active === "ar";
  const searchText = query.text ?? "";

  return (
    <main className="zyara-shell" lang={active} dir={ar ? "rtl" : "ltr"}>
      <nav className="zyara-nav" aria-label="Primary navigation">
        <a className="zyara-brand" href={`/${active}`} aria-label="Zyara home">
          <span className="zyara-mark" aria-hidden="true">Z</span>
          <span className="zyara-wordmark">Zyara</span>
        </a>
        <div className="zyara-nav-links">
          <a className="zyara-nav-link" href={`/${active}`}>{ar ? "الرئيسية" : "Home"}</a>
          <a className="zyara-nav-link" href={`/${active}/map`}>{ar ? "الخريطة" : "Map"}</a>
          <span className="zyara-location-chip">⌖ {ar ? "الرياض" : "Riyadh"}</span>
        </div>
      </nav>

      <section className="zyara-page">
        <header className="zyara-page-head">
          <span className="zyara-eyebrow">{ar ? "اكتشف الرعاية القريبة" : "Find care near you"}</span>
          <h1 className="zyara-page-title">{ar ? "اختر المكان المناسب، لا الأقرب فقط." : "The right care, not just the nearest care."}</h1>
          <p className="zyara-page-subtitle">
            {ar
              ? "قارن المسافة، وقت الوصول، ساعات العمل، التخصصات، التقييمات، وأقرب موعد متاح قبل اتخاذ قرارك."
              : "Compare distance, travel time, opening hours, specialties, ratings, and next availability before you decide."}
          </p>
          <form className="zyara-searchbar" action={`/${active}/search`} method="get" aria-label="Provider search">
            <input
              id="q"
              name="text"
              type="search"
              defaultValue={searchText}
              placeholder={ar ? "ابحث عن طبيب، عيادة، تخصص أو عرض..." : "Search doctors, clinics, specialties, or symptoms..."}
              aria-label={ar ? "البحث عن الرعاية" : "Search care"}
            />
            <span className="zyara-location-chip">⌖ {ar ? "الرياض" : "Riyadh"}</span>
            <button className="zyara-primary" type="submit">{ar ? "بحث" : "Search"} →</button>
          </form>
        </header>

        <div className="zyara-filter-row" aria-label="Search filters">
          <button className="zyara-filter active" type="button">{ar ? "الكل" : "All"}</button>
          <button className="zyara-filter" type="button">{ar ? "مفتوح الآن" : "Open now"}</button>
          <button className="zyara-filter" type="button">{ar ? "أقل من 5 كم" : "Under 5 km"}</button>
          <button className="zyara-filter" type="button">{ar ? "متاح اليوم" : "Available today"}</button>
          <button className="zyara-filter" type="button">{ar ? "عيادات" : "Clinics"}</button>
          <button className="zyara-filter" type="button">{ar ? "أطباء" : "Doctors"}</button>
          <button className="zyara-filter" type="button">{ar ? "أسنان" : "Dentists"}</button>
          <button className="zyara-filter" type="button">{ar ? "المزيد" : "More"}</button>
        </div>

        <div className="zyara-search-layout">
          <section aria-labelledby="results-heading">
            <div className="zyara-list-heading">
              <h2 id="results-heading">{ar ? "الأماكن الأقرب إليك" : "Closest places to you"}</h2>
              <span>{NEARBY_PLACES.length} {ar ? "نتائج تجريبية" : "preview results"}</span>
            </div>
            <div className="zyara-results">
              {NEARBY_PLACES.map((place) => (
                <article className="zyara-card" key={place.id}>
                  <div className="zyara-place-thumb" aria-hidden="true">{place.kind.toUpperCase()}</div>
                  <div>
                    <div className="zyara-card-top">
                      <div>
                        <div className="zyara-card-kicker">{place.area} · {place.verified ? "Verified" : "Unverified"}</div>
                        <h3>{place.name}</h3>
                      </div>
                      <span className="zyara-distance">⌖ {place.distanceKm} km · {place.driveMinutes} min</span>
                    </div>
                    <div className="zyara-meta">
                      <span>★ {place.rating} ({place.reviews})</span>
                      <span>{place.address}</span>
                      <span>{place.doctors} {ar ? "أطباء" : "doctors"}</span>
                    </div>
                    <div className="zyara-tags">
                      {place.specialties.map((specialty) => <span className="zyara-tag" key={specialty}>{specialty}</span>)}
                    </div>
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

            <div className="zyara-list-heading" style={{ marginTop: 32 }}>
              <h2>{ar ? "أطباء بالقرب منك" : "Doctors near you"}</h2>
              <span>{NEARBY_DOCTORS.length} {ar ? "نتائج تجريبية" : "preview results"}</span>
            </div>
            <div className="zyara-doctors-grid">
              {NEARBY_DOCTORS.map((doctor) => (
                <article className="zyara-doctor-card" key={doctor.id}>
                  <div className="zyara-doctor-row">
                    <div className="zyara-doctor-avatar" aria-hidden="true">MD</div>
                    <div><h3>{doctor.name}</h3><div className="zyara-meta"><span>{doctor.specialty}</span><span>★ {doctor.rating}</span></div></div>
                  </div>
                  <div className="zyara-meta"><span>{doctor.placeName}</span><span>{doctor.distanceKm} km</span></div>
                  <div className="zyara-availability"><span>{ar ? "أقرب موعد" : "Next"}: {doctor.nextAvailable}</span></div>
                  <a className="zyara-primary" href={`/${active}/book?doctor=${doctor.id}`}>{ar ? "احجز موعدًا" : "Book appointment"}</a>
                </article>
              ))}
            </div>
          </section>

          <aside className="zyara-map-panel" role="application" aria-label="Nearby care map" data-renderer="maplibre" data-fallback="list">
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
              <a className="zyara-secondary" href={`/${active}/map`}>{ar ? "فتح الخريطة" : "Open map"}</a>
              <span className="zyara-location-chip">⌖ {ar ? "موقعي التقريبي" : "Approximate location"}</span>
            </div>
            <div className="zyara-map-place">
              <article className="zyara-floating-card">
                <div className="zyara-place-thumb" aria-hidden="true">CARE</div>
                <div>
                  <h3>{NEARBY_PLACES[0].name}</h3>
                  <div className="zyara-meta"><span>★ {NEARBY_PLACES[0].rating}</span><span>{NEARBY_PLACES[0].distanceKm} km · {NEARBY_PLACES[0].driveMinutes} min</span><span className="zyara-positive">● {ar ? "مفتوح" : "Open"}</span></div>
                </div>
                <a className="zyara-primary" href={directionsUrl(NEARBY_PLACES[0])} target="_blank" rel="noreferrer">{ar ? "اذهب" : "Go"} ↗</a>
              </article>
            </div>
          </aside>
        </div>

        <p className="zyara-demo-note" style={{ marginTop: 18 }}>Preview experience uses rights-cleared synthetic provider data; no real provider availability is claimed.</p>
      </section>
    </main>
  );
}
