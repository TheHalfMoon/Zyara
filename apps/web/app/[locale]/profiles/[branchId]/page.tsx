import { isSupportedLocale } from "@zyara/domain";
import { directionsUrl, mapUrl, placeById } from "../../discovery-data";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string; branchId: string }> }) {
  const { locale, branchId } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  const ar = active === "ar";
  const place = placeById(branchId);

  if (!place) {
    return (
      <main className="zyara-shell">
        <section className="zyara-page">
          <h1 className="zyara-page-title">{ar ? "لم نجد هذا المكان." : "We couldn’t find this place."}</h1>
          <a className="zyara-primary" href={`/${active}/search`}>{ar ? "العودة للبحث" : "Back to search"}</a>
        </section>
      </main>
    );
  }

  return (
    <main className="zyara-shell" lang={active} dir={ar ? "rtl" : "ltr"}>
      <nav className="zyara-nav" aria-label="Primary navigation">
        <a className="zyara-brand" href={`/${active}`} aria-label="Zyara start">
          <span className="zyara-mark" aria-hidden="true">Z</span>
          <span className="zyara-wordmark">Zyara</span>
        </a>
        <div className="zyara-nav-links">
          <a className="zyara-nav-link" href={`/${active}/search`}>{ar ? "اكتشف الرعاية" : "Find care"}</a>
          <a className="zyara-nav-link" href={`/${active}/map`}>{ar ? "الخريطة" : "Map"}</a>
          <span className="zyara-location-chip">⌖ {place.distanceKm} km · {place.driveMinutes} min</span>
        </div>
      </nav>

      <section className="zyara-page">
        <article className="zyara-profile-hero">
          <div className="zyara-profile-copy">
            <span className="zyara-eyebrow">{place.area} · {place.verified ? (ar ? "موثّق" : "Verified") : (ar ? "غير موثّق" : "Unverified")}</span>
            <h1 className="zyara-page-title" style={{ fontSize: "clamp(42px, 6vw, 76px)" }}>{place.name}</h1>
            <div className="zyara-meta" style={{ marginTop: 16, fontSize: 14 }}>
              <span>★ {place.rating} ({place.reviews} {ar ? "تقييم" : "reviews"})</span>
              <span>⌖ {place.distanceKm} km · {place.driveMinutes} min {ar ? "بالسيارة" : "drive"}</span>
              <span className="zyara-positive">● {ar ? "مفتوح الآن" : "Open now"}</span>
              <span>{ar ? "يغلق" : "Closes"} {place.closesAt}</span>
            </div>
            <p className="zyara-page-subtitle" style={{ marginTop: 18 }}>{place.address}</p>
            <div className="zyara-tags" style={{ marginTop: 18 }}>
              {place.specialties.map((specialty) => <span className="zyara-tag" key={specialty}>{specialty}</span>)}
            </div>
            <div className="zyara-card-actions" aria-label="profile-actions" style={{ marginTop: 24 }}>
              <a className="zyara-primary" href={`/${active}/book?branch=${place.id}`}>{ar ? "احجز موعدًا" : "Book appointment"}</a>
              <a className="zyara-secondary" href={directionsUrl(place)} target="_blank" rel="noreferrer">{ar ? "الاتجاهات" : "Directions"} ↗</a>
              <a className="zyara-secondary" href={mapUrl(place)} target="_blank" rel="noreferrer">{ar ? "افتح في الخرائط" : "Open in Maps"} ↗</a>
            </div>
            <div className="zyara-availability" style={{ marginTop: 20 }}>
              <span><strong>{ar ? "أقرب موعد:" : "Next available:"}</strong> {place.nextAvailable}</span>
              <span>{place.doctors} {ar ? "أطباء في هذا الموقع" : "doctors at this location"}</span>
            </div>
          </div>
          <div className="zyara-profile-visual" aria-label={`${place.name} location preview`}>
            <span className="zyara-profile-badge">⌖ {place.distanceKm} km · {place.driveMinutes} min</span>
            <div className="zyara-map-grid" aria-hidden="true" />
            <div className="zyara-map-road" aria-hidden="true" />
            <div className="zyara-map-road second" aria-hidden="true" />
            <span className="zyara-pin p2" aria-hidden="true"><span>{place.rating}</span></span>
          </div>
        </article>

        <div className="zyara-profile-grid">
          <section className="zyara-panel" aria-labelledby="hours-heading">
            <div className="zyara-list-heading">
              <h2 id="hours-heading">{ar ? "ساعات العمل" : "Working hours"}</h2>
              <span className="zyara-positive">● {ar ? "مفتوح الآن" : "Open now"} · {ar ? "يغلق" : "Closes"} {place.closesAt}</span>
            </div>
            <div className="zyara-hours">
              {place.hours.map((row) => (
                <div className="zyara-hour-row" key={row.day}>
                  <span>{row.day}</span>
                  <strong>{row.hours}</strong>
                </div>
              ))}
            </div>
          </section>

          <aside className="zyara-panel" aria-labelledby="route-heading">
            <h2 id="route-heading">{ar ? "كيف تصل" : "Getting there"}</h2>
            <div className="zyara-route-card">
              <span className="zyara-card-kicker">{ar ? "من موقعك التقريبي" : "From your approximate location"}</span>
              <strong>{place.distanceKm} km · {place.driveMinutes} min</strong>
              <span className="zyara-meta">{place.address}</span>
              <a className="zyara-primary" href={directionsUrl(place)} target="_blank" rel="noreferrer">{ar ? "ابدأ الاتجاهات" : "Start directions"} ↗</a>
            </div>
          </aside>
        </div>

        <div className="zyara-profile-grid">
          <section className="zyara-panel" aria-labelledby="about-heading">
            <h2 id="about-heading">{ar ? "الخدمات في هذا الموقع" : "Care at this location"}</h2>
            <div className="zyara-tags">
              {place.specialties.map((specialty) => <span className="zyara-tag" key={specialty}>{specialty}</span>)}
            </div>
            <p className="zyara-page-subtitle" style={{ fontSize: 14, marginTop: 18 }}>
              {ar
                ? "يعرض Zyara حالة التوثيق، المسافة، ساعات العمل، وأسلوب الحجز بشكل منفصل حتى لا تبدو أي معلومة غير مؤكدة كحقيقة مضمونة."
                : "Zyara keeps verification, distance, working hours, and booking capability separate so uncertain information never appears guaranteed."}
            </p>
          </section>

          <aside className="zyara-panel" aria-labelledby="coverage-heading">
            <h2 id="coverage-heading">{ar ? "معلومات قبل الزيارة" : "Before you visit"}</h2>
            <div className="zyara-hours">
              <div className="zyara-hour-row"><span>{ar ? "وضع الحجز" : "Booking mode"}</span><strong>{ar ? "حجز مباشر تجريبي" : "Preview native booking"}</strong></div>
              <div className="zyara-hour-row"><span>{ar ? "التأمين" : "Insurance"}</span><strong>{ar ? "تحقق مع العيادة" : "Confirm with clinic"}</strong></div>
              <div className="zyara-hour-row"><span>{ar ? "آخر تحديث" : "Freshness"}</span><strong>observed 2026-09-16</strong></div>
            </div>
            <p className="zyara-demo-note" style={{ marginTop: 14 }}>Insurance acceptance not guaranteed · Booking: preview native</p>
          </aside>
        </div>

        <p className="zyara-demo-note" style={{ marginTop: 18 }}>Preview profile uses a rights-cleared synthetic provider identity and demo coordinates. No real opening-hours, insurance, availability, or provider claim is made.</p>
      </section>
    </main>
  );
}
