import { isSupportedLocale } from "@zyara/domain";
import { directionsUrl, doctorsForPlace, mapUrl, placeById, whatsappUrl } from "../../discovery-data";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string; branchId: string }> }) {
  const { locale, branchId } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  const ar = active === "ar";
  const place = placeById(branchId);

  if (!place) {
    return (
      <main className="zyara-shell"><section className="zyara-page"><h1 className="zyara-page-title">{ar ? "لم نجد هذا المكان." : "We couldn’t find this place."}</h1><a className="zyara-primary" href={`/${active}/search`}>{ar ? "العودة للبحث" : "Back to search"}</a></section></main>
    );
  }

  const doctors = doctorsForPlace(place.id);

  return (
    <main className="zyara-shell" lang={active} dir={ar ? "rtl" : "ltr"}>
      <nav className="zyara-nav" aria-label="Primary navigation">
        <a className="zyara-brand" href={`/${active}`} aria-label="Zyara start"><span className="zyara-mark" aria-hidden="true">Z</span><span className="zyara-wordmark">Zyara</span></a>
        <div className="zyara-nav-links"><a className="zyara-nav-link" href={`/${active}/search`}>{ar ? "اكتشف" : "Find care"}</a><a className="zyara-nav-link" href={`/${active}/specialties`}>{ar ? "التخصصات" : "Specialties"}</a><a className="zyara-nav-link" href={`/${active}/map`}>{ar ? "الخريطة" : "Map"}</a><span className="zyara-location-chip">⌖ {place.distanceKm} km · {place.driveMinutes} min</span></div>
      </nav>

      <section className="zyara-page">
        <div className="zyara-facility-gallery" aria-label={`${place.name} gallery preview`}>
          <div className="zyara-gallery-main"><span>{place.kind.toUpperCase()}</span></div>
          <div className="zyara-gallery-side one"><span>{ar ? "المدخل" : "Entrance"}</span></div>
          <div className="zyara-gallery-side two"><span>{ar ? "الاستقبال" : "Reception"}</span></div>
        </div>

        <article className="zyara-facility-header">
          <div>
            <span className="zyara-eyebrow">{place.area} · {place.kind} · {place.verified ? (ar ? "ملف مؤكد" : "Profile confirmed") : (ar ? "غير مؤكد" : "Unconfirmed")}</span>
            <h1 className="zyara-page-title">{place.name}</h1>
            <p className="zyara-page-subtitle">{place.address}</p>
            <div className="zyara-tags">{place.specialties.map((specialty) => <span className="zyara-tag" key={specialty}>{specialty}</span>)}</div>
          </div>
          <div className="zyara-facility-score-card">
            <span>{ar ? "تقييم المنشأة" : "Facility rating"}</span>
            <strong>★ {place.rating}</strong>
            <small>{place.reviews} {ar ? "تجربة منشأة" : "facility reviews"}</small>
            <span className="zyara-positive">● {ar ? "مفتوح الآن" : "Open now"}</span>
          </div>
        </article>

        <div className="zyara-sticky-action-bar" aria-label="Facility actions">
          <div className="zyara-sticky-location"><strong>⌖ {place.distanceKm} km · {place.driveMinutes} min</strong><span>{ar ? "يغلق" : "Closes"} {place.closesAt}</span></div>
          <div className="zyara-card-actions zyara-contact-actions"><a className="zyara-secondary" href={`tel:${place.phone}`}>☎ {ar ? "اتصال" : "Call"}</a><a className="zyara-secondary" href={whatsappUrl(place)} target="_blank" rel="noreferrer">◔ WhatsApp</a><a className="zyara-secondary" href={directionsUrl(place)} target="_blank" rel="noreferrer">⌖ {ar ? "اتجاهات" : "Directions"}</a><a className="zyara-secondary" href={place.website} target="_blank" rel="noreferrer">↗ {ar ? "الموقع" : "Website"}</a><a className="zyara-primary" href={`/${active}/book?branch=${place.id}`}>{ar ? "احجز" : "Book"}</a></div>
        </div>

        <div className="zyara-facility-overview-grid">
          <section className="zyara-panel">
            <span className="zyara-card-kicker">{ar ? "قبل أن تذهب" : "Before you go"}</span>
            <h2>{ar ? "معلومات أساسية" : "Essential details"}</h2>
            <div className="zyara-hours">
              <div className="zyara-hour-row"><span>{ar ? "الحالة" : "Status"}</span><strong className="zyara-positive">● {ar ? "مفتوح الآن" : "Open now"}</strong></div>
              <div className="zyara-hour-row"><span>{ar ? "يغلق" : "Closes"}</span><strong>{place.closesAt}</strong></div>
              <div className="zyara-hour-row"><span>{ar ? "الهاتف" : "Phone"}</span><strong>{place.phone}</strong></div>
              <div className="zyara-hour-row"><span>WhatsApp</span><strong>{place.whatsapp}</strong></div>
              <div className="zyara-hour-row"><span>{ar ? "تأكيد الملف" : "Profile confirmed"}</span><strong>{place.freshnessDays} {ar ? "أيام" : "days ago"}</strong></div>
            </div>
          </section>
          <section className="zyara-panel">
            <span className="zyara-card-kicker">{ar ? "التغطية" : "Insurance"}</span>
            <h2>{ar ? "شبكات التأمين المدرجة" : "Listed insurance networks"}</h2>
            <div className="zyara-insurance-grid">{place.insurers.map((insurer) => <span key={insurer}>{insurer}<small>{ar ? `تم التأكيد قبل ${place.freshnessDays} أيام` : `confirmed ${place.freshnessDays} days ago`}</small></span>)}</div>
            <p className="zyara-demo-note">{ar ? "القبول المدرج لا يضمن تغطية المنفعة أو الموافقة المسبقة." : "Listed acceptance does not guarantee member benefit coverage or prior authorization."}</p>
          </section>
        </div>

        <section className="zyara-section" aria-labelledby="doctors-heading">
          <header className="zyara-section-head"><div><span className="zyara-eyebrow">{ar ? "الفريق الطبي" : "Medical team"}</span><h2 id="doctors-heading">{ar ? "أطباء يعملون في هذا الموقع" : "Doctors at this location"}</h2></div><p>{ar ? "تقييم الطبيب منفصل عن تقييم المنشأة، حتى ترى التجربتين بوضوح." : "Doctor reputation stays separate from facility reputation so you can judge both experiences clearly."}</p></header>
          <div className="zyara-doctors-grid zyara-doctors-grid-v2">
            {doctors.map((doctor) => (
              <article className="zyara-doctor-card zyara-doctor-card-v2" key={doctor.id}>
                <div className="zyara-doctor-row"><div className="zyara-doctor-avatar" aria-hidden="true">MD</div><div><span className="zyara-card-kicker">{doctor.title}</span><h3>{doctor.name}</h3><div className="zyara-meta"><span>{doctor.specialty}</span><span>{doctor.subspecialty}</span></div></div></div>
                <div className="zyara-rating-split"><div><span>{ar ? "الطبيب" : "Doctor"}</span><strong>★ {doctor.rating}</strong><small>{doctor.reviews}</small></div><div><span>{ar ? "المنشأة" : "Facility"}</span><strong>★ {place.rating}</strong><small>{place.reviews}</small></div></div>
                <div className="zyara-availability"><span>{ar ? "أقرب موعد" : "Next"}: {doctor.locations.find((location) => location.placeId === place.id)?.nextAvailable ?? doctor.nextAvailable}</span></div>
                <div className="zyara-card-actions"><a className="zyara-secondary" href={`/${active}/doctors/${doctor.id}`}>{ar ? "ملف الطبيب" : "Doctor profile"}</a><a className="zyara-primary" href={`/${active}/book?doctor=${doctor.id}&branch=${place.id}`}>{ar ? "احجز" : "Book"}</a></div>
              </article>
            ))}
            {doctors.length === 0 ? <div className="zyara-empty-state"><strong>{ar ? "لا توجد ملفات أطباء تجريبية لهذا الموقع بعد." : "No synthetic doctor profiles are linked to this location yet."}</strong></div> : null}
          </div>
        </section>

        <div className="zyara-profile-grid">
          <section className="zyara-panel" aria-labelledby="services-heading"><span className="zyara-card-kicker">{ar ? "الخدمات" : "Services"}</span><h2 id="services-heading">{ar ? "الخدمات في هذا الموقع" : "Care available here"}</h2><div className="zyara-service-list">{place.services.map((service) => <div key={service}><span>✓</span><strong>{service}</strong></div>)}</div></section>
          <aside className="zyara-panel" aria-labelledby="hours-heading"><span className="zyara-card-kicker">{ar ? "الدوام" : "Hours"}</span><h2 id="hours-heading">{ar ? "ساعات العمل" : "Working hours"}</h2><div className="zyara-hours">{place.hours.map((row) => <div className="zyara-hour-row" key={row.day}><span>{row.day}</span><strong>{row.hours}</strong></div>)}</div></aside>
        </div>

        <div className="zyara-profile-grid">
          <section className="zyara-panel">
            <span className="zyara-card-kicker">{ar ? "آراء المنشأة" : "Facility reviews"}</span>
            <div className="zyara-review-summary"><strong>★ {place.rating}</strong><span>{place.reviews} {ar ? "تقييم تجريبي للمنشأة" : "synthetic facility reviews"}</span></div>
            <div className="zyara-review-themes"><span>{ar ? "الاستقبال" : "Reception"}</span><span>{ar ? "وقت الانتظار" : "Waiting"}</span><span>{ar ? "النظافة" : "Cleanliness"}</span><span>{ar ? "سهولة الوصول" : "Accessibility"}</span></div>
            <p className="zyara-page-subtitle zyara-small-copy">{ar ? "هذه السمعة تخص تجربة المكان نفسه ولا تدخل في تقييم أي طبيب." : "This reputation belongs to the facility experience and never gets averaged into a doctor score."}</p>
          </section>
          <aside className="zyara-panel">
            <span className="zyara-card-kicker">{ar ? "الوصول" : "Getting there"}</span>
            <h2>⌖ {place.distanceKm} km · {place.driveMinutes} min</h2>
            <p className="zyara-page-subtitle zyara-small-copy">{place.address}</p>
            <div className="zyara-card-actions"><a className="zyara-primary" href={directionsUrl(place)} target="_blank" rel="noreferrer">{ar ? "ابدأ الاتجاهات" : "Start directions"} ↗</a><a className="zyara-secondary" href={mapUrl(place)} target="_blank" rel="noreferrer">{ar ? "افتح في الخرائط" : "Open in Maps"}</a></div>
          </aside>
        </div>

        <p className="zyara-demo-note">Preview profile uses rights-cleared synthetic provider identity, contact details, ratings, insurance and demo coordinates. No real provider claim is made.</p>
      </section>
    </main>
  );
}
