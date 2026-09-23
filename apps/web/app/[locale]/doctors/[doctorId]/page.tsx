import { isSupportedLocale } from "@zyara/domain";
import { doctorById, directionsUrl, placeById, whatsappUrl } from "../../discovery-data";

export default async function DoctorProfilePage({ params }: { params: Promise<{ locale: string; doctorId: string }> }) {
  const { locale, doctorId } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  const ar = active === "ar";
  const doctor = doctorById(doctorId);

  if (!doctor) {
    return (
      <main className="zyara-shell"><section className="zyara-page"><h1 className="zyara-page-title">{ar ? "لم نجد هذا الطبيب." : "We couldn’t find this doctor."}</h1><a className="zyara-primary" href={`/${active}/search?type=doctor`}>{ar ? "العودة للبحث" : "Back to doctors"}</a></section></main>
    );
  }

  const primaryPlace = placeById(doctor.placeId);

  return (
    <main className="zyara-shell" lang={active} dir={ar ? "rtl" : "ltr"}>
      <nav className="zyara-nav" aria-label="Primary navigation">
        <a className="zyara-brand" href={`/${active}`} aria-label="Zyara home"><span className="zyara-mark" aria-hidden="true">Z</span><span className="zyara-wordmark">Zyara</span></a>
        <div className="zyara-nav-links"><a className="zyara-nav-link" href={`/${active}/search?type=doctor`}>{ar ? "الأطباء" : "Doctors"}</a><a className="zyara-nav-link" href={`/${active}/specialties`}>{ar ? "التخصصات" : "Specialties"}</a><span className="zyara-location-chip">⌖ {doctor.distanceKm} km</span></div>
      </nav>

      <section className="zyara-page">
        <article className="zyara-doctor-profile-hero">
          <div className="zyara-doctor-profile-avatar" aria-hidden="true">MD</div>
          <div className="zyara-doctor-profile-main">
            <span className="zyara-eyebrow">{doctor.title}</span>
            <h1 className="zyara-page-title">{doctor.name}</h1>
            <p className="zyara-page-subtitle">{doctor.specialty}{doctor.subspecialty ? ` · ${doctor.subspecialty}` : ""}</p>
            <div className="zyara-doctor-trust-row">
              <div><span>{ar ? "تقييم الطبيب" : "Doctor rating"}</span><strong>★ {doctor.rating}</strong><small>{doctor.reviews} {ar ? "تجربة موثقة تجريبية" : "synthetic verified-style reviews"}</small></div>
              <div><span>{ar ? "الخبرة" : "Experience"}</span><strong>{doctor.experienceYears}</strong><small>{ar ? "سنة" : "years"}</small></div>
              <div><span>{ar ? "أماكن العمل" : "Practice locations"}</span><strong>{doctor.locations.length}</strong><small>{ar ? "مواقع حالية" : "current locations"}</small></div>
              <div><span>{ar ? "آخر تأكيد" : "Profile freshness"}</span><strong>{doctor.freshnessDays}</strong><small>{ar ? "أيام" : "days ago"}</small></div>
            </div>
            <div className="zyara-tags">{doctor.languages.map((language) => <span className="zyara-tag" key={language}>{language}</span>)}{doctor.expertise.map((item) => <span className="zyara-tag" key={item}>{item}</span>)}</div>
            <div className="zyara-card-actions"><a className="zyara-primary" href={`/${active}/book?doctor=${doctor.id}`}>{ar ? "احجز مع الطبيب" : "Book this doctor"}</a>{primaryPlace ? <a className="zyara-secondary" href={`tel:${primaryPlace.bookingPhone}`}>☎ {ar ? "اتصل بالموقع الأقرب" : "Call nearest location"}</a> : null}</div>
          </div>
        </article>

        <div className="zyara-profile-grid zyara-doctor-detail-grid">
          <section className="zyara-panel">
            <span className="zyara-card-kicker">{ar ? "المؤهلات والخلفية" : "Background & credentials"}</span>
            <h2>{ar ? "التعليم والتأهيل" : "Education & qualifications"}</h2>
            <div className="zyara-timeline-list">{doctor.education.map((item) => <div key={item}><span className="zyara-timeline-dot" /><span>{item}</span></div>)}{doctor.qualifications.map((item) => <div key={item}><span className="zyara-timeline-dot" /><strong>{item}</strong></div>)}</div>
            <p className="zyara-demo-note">{ar ? "بيانات العرض تجريبية. في الإنتاج لا تظهر المؤهلات إلا مع مصدر وحالة صلاحية واضحة." : "Preview data only. Production credentials must carry provenance and validity state before display."}</p>
          </section>
          <aside className="zyara-panel">
            <span className="zyara-card-kicker">{ar ? "الخدمات" : "Services"}</span>
            <h2>{ar ? "ما يقدمه هذا الطبيب" : "What this doctor offers"}</h2>
            <div className="zyara-service-list">{doctor.services.map((service) => <div key={service}><span>✓</span><strong>{service}</strong></div>)}</div>
          </aside>
        </div>

        <section className="zyara-section" aria-labelledby="locations-heading">
          <header className="zyara-section-head"><div><span className="zyara-eyebrow">{ar ? "اختر مكان الزيارة" : "Choose where to see this doctor"}</span><h2 id="locations-heading">{ar ? "أماكن عمل الطبيب" : "Practice locations"}</h2></div><p>{ar ? "نفس الطبيب، لكن تجربة المنشأة والتأمين والدوام والمسافة تختلف حسب الموقع." : "Same doctor, but facility reputation, insurance, hours and distance can differ by location."}</p></header>
          <div className="zyara-location-options">
            {doctor.locations.map((location) => {
              const place = placeById(location.placeId);
              if (!place) return null;
              return (
                <article className="zyara-location-option" key={location.placeId}>
                  <div className="zyara-location-option-head"><div><span className="zyara-card-kicker">{place.area} · {place.kind}</span><h3>{place.name}</h3></div><span className="zyara-distance">⌖ {location.distanceKm} km · {place.driveMinutes} min</span></div>
                  <div className="zyara-rating-split"><div><span>{ar ? "الطبيب" : "Doctor"}</span><strong>★ {doctor.rating}</strong><small>{doctor.reviews} {ar ? "تقييم" : "reviews"}</small></div><div><span>{ar ? "المنشأة" : "Facility"}</span><strong>★ {place.rating}</strong><small>{place.reviews} {ar ? "تقييم منشأة" : "facility reviews"}</small></div></div>
                  <div className="zyara-availability"><span className={place.openNow ? "zyara-positive" : ""}>● {place.openNow ? (ar ? "مفتوح الآن" : "Open now") : (ar ? "مغلق" : "Closed")}</span><span>{ar ? "يغلق" : "Closes"} {place.closesAt}</span><span>{ar ? "أقرب موعد" : "Next"}: {location.nextAvailable}</span></div>
                  <div className="zyara-tags">{location.insurers.map((insurer) => <span className="zyara-tag" key={insurer}>{insurer}</span>)}</div>
                  <div className="zyara-card-actions zyara-contact-actions"><a className="zyara-secondary" href={`tel:${place.phone}`}>☎ {ar ? "اتصال" : "Call"}</a><a className="zyara-secondary" href={whatsappUrl(place)} target="_blank" rel="noreferrer">◔ WhatsApp</a><a className="zyara-secondary" href={directionsUrl(place)} target="_blank" rel="noreferrer">⌖ {ar ? "اتجاهات" : "Directions"}</a><a className="zyara-primary" href={`/${active}/book?doctor=${doctor.id}&branch=${place.id}`}>{ar ? "اختر هذا الموقع" : "Choose this location"}</a></div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="zyara-review-separation">
          <div className="zyara-panel"><span className="zyara-card-kicker">{ar ? "سمعة الطبيب" : "Doctor reputation"}</span><h2>★ {doctor.rating}</h2><p>{ar ? "يخص التواصل والاستماع والشرح والاحترام وتجربة الطبيب — ولا يختلط بتقييم المنشأة." : "Represents the doctor experience — communication, listening, explanation and respect — separate from facility operations."}</p></div>
          <div className="zyara-panel"><span className="zyara-card-kicker">{ar ? "سمعة مكان الزيارة" : "Facility reputation"}</span><h2>{ar ? "تُعرض لكل موقع" : "Shown per location"}</h2><p>{ar ? "الاستقبال والانتظار والنظافة والتنظيم وسهولة الوصول تخص المنشأة نفسها." : "Reception, waiting, cleanliness, organization and accessibility belong to the facility itself."}</p></div>
        </section>

        <p className="zyara-demo-note">Preview doctor profile uses synthetic identity, qualifications, ratings, insurance and availability. No real provider claim is made.</p>
      </section>
    </main>
  );
}
