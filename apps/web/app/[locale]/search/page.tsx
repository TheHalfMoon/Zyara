import { isSupportedLocale } from "@zyara/domain";
import { NEARBY_DOCTORS, NEARBY_PLACES, SPECIALTIES, directionsUrl, specialtyBySlug, whatsappUrl } from "../discovery-data";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ text?: string; type?: string; specialty?: string; mode?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const active = isSupportedLocale(locale) ? locale : "ar";
  const ar = active === "ar";
  const searchText = query.text ?? "";
  const resultType = query.type === "doctor" || query.type === "clinic" ? query.type : "all";
  const specialty = query.specialty ? specialtyBySlug(query.specialty) : null;
  const terms = [searchText, specialty?.name ?? "", specialty?.nameAr ?? "", ...(specialty?.aliases ?? [])].map(normalize).filter(Boolean);

  const matches = (values: string[]) => {
    if (terms.length === 0) return true;
    const haystack = normalize(values.join(" "));
    return terms.some((term) => haystack.includes(term) || term.includes(haystack));
  };

  const places = NEARBY_PLACES.filter((place) => matches([place.name, place.area, place.address, ...place.specialties, ...place.services, ...place.insurers]));
  const doctors = NEARBY_DOCTORS.filter((doctor) => matches([doctor.name, doctor.title, doctor.specialty, doctor.subspecialty ?? "", ...doctor.expertise, ...doctor.services, ...doctor.languages]));
  const showPlaces = resultType !== "doctor";
  const showDoctors = resultType !== "clinic";
  const total = (showPlaces ? places.length : 0) + (showDoctors ? doctors.length : 0);
  const modeVoice = query.mode === "voice";

  const hrefForType = (type: "all" | "doctor" | "clinic") => {
    const params = new URLSearchParams();
    if (searchText) params.set("text", searchText);
    if (query.specialty) params.set("specialty", query.specialty);
    if (type !== "all") params.set("type", type);
    const suffix = params.toString();
    return `/${active}/search${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <main className="zyara-shell" lang={active} dir={ar ? "rtl" : "ltr"}>
      <nav className="zyara-nav" aria-label="Primary navigation">
        <a className="zyara-brand" href={`/${active}`} aria-label="Zyara home"><span className="zyara-mark" aria-hidden="true">Z</span><span className="zyara-wordmark">Zyara</span></a>
        <div className="zyara-nav-links">
          <a className="zyara-nav-link" href={`/${active}`}>{ar ? "الرئيسية" : "Home"}</a>
          <a className="zyara-nav-link" href={`/${active}/specialties`}>{ar ? "التخصصات" : "Specialties"}</a>
          <a className="zyara-nav-link" href={`/${active}/map`}>{ar ? "الخريطة" : "Map"}</a>
          <span className="zyara-location-chip">⌖ {ar ? "الرياض" : "Riyadh"}</span>
        </div>
      </nav>

      <section className="zyara-page zyara-search-page">
        <header className="zyara-page-head zyara-search-head">
          <div>
            <span className="zyara-eyebrow">{ar ? "اكتشف الرعاية بطريقتك" : "Find care your way"}</span>
            <h1 className="zyara-page-title">{ar ? "طبيب أم عيادة؟ قارن الاثنين." : "Doctor or clinic? Compare both."}</h1>
            <p className="zyara-page-subtitle">{ar ? "ابحث باسم طبيب أو منشأة أو تخصص أو خدمة، ثم شاهد النتائج مع المسافة والدوام والتأمين والتقييمات المنفصلة." : "Search by doctor, facility, specialty or service, then compare distance, hours, insurance and separate doctor/facility reputation."}</p>
          </div>
          <form className="zyara-searchbar zyara-searchbar-ai zyara-searchbar-wide" action={`/${active}/search`} method="get" aria-label="Provider search">
            <span className="zyara-ai-orb" aria-hidden="true">Z</span>
            <input id="q" name="text" type="search" defaultValue={searchText} placeholder={ar ? "مثال: دكتور عظام قريب يقبل بوبا ويفتح بعد 6" : "Try: orthopedic doctor near me, Bupa, open after 6"} aria-label={ar ? "البحث عن الرعاية" : "Search care"} />
            <a className={`zyara-voice-button${modeVoice ? " active" : ""}`} href={`/${active}/search?mode=voice`} aria-label={ar ? "البحث بالصوت" : "Voice search"}>⌁ {ar ? "تكلم" : "Speak"}</a>
            <button className="zyara-primary" type="submit">{ar ? "بحث" : "Search"} →</button>
          </form>
          {modeVoice ? (
            <div className="zyara-voice-panel" role="status">
              <span className="zyara-voice-pulse" aria-hidden="true" />
              <div><strong>{ar ? "البحث الصوتي جاهز لتجربة الواجهة" : "Voice discovery UI is ready"}</strong><span>{ar ? "الإطلاق الفعلي للميكروفون وASR يبقى خلف بوابة الجودة والخصوصية؛ النص والصوت سيستخدمان نفس بحث Zyara المنظم." : "Live microphone/ASR remains behind its quality and privacy gate; typed and spoken search will share the same structured Zyara search path."}</span></div>
            </div>
          ) : null}
        </header>

        <div className="zyara-search-toolbar">
          <div className="zyara-entity-tabs" aria-label="Result type">
            <a className={resultType === "all" ? "active" : ""} href={hrefForType("all")}>{ar ? "الكل" : "All"} <span>{places.length + doctors.length}</span></a>
            <a className={resultType === "doctor" ? "active" : ""} href={hrefForType("doctor")}>{ar ? "الأطباء" : "Doctors"} <span>{doctors.length}</span></a>
            <a className={resultType === "clinic" ? "active" : ""} href={hrefForType("clinic")}>{ar ? "العيادات والمستشفيات" : "Clinics & Hospitals"} <span>{places.length}</span></a>
          </div>
          <div className="zyara-sort-row"><span>{ar ? `${total} نتيجة تجريبية` : `${total} preview results`}</span><button className="zyara-filter active" type="button">{ar ? "مقترح" : "Recommended"}</button><button className="zyara-filter" type="button">{ar ? "الأقرب" : "Nearest"}</button><button className="zyara-filter" type="button">{ar ? "مفتوح الآن" : "Open now"}</button></div>
        </div>

        <div className="zyara-specialty-rail" aria-label="Specialties">
          {SPECIALTIES.slice(0, 10).map((item) => <a className={`zyara-chip${query.specialty === item.slug ? " active" : ""}`} key={item.slug} href={`/${active}/search?specialty=${item.slug}`}>{item.icon} {ar ? item.nameAr : item.name}</a>)}
        </div>

        <div className="zyara-search-layout zyara-search-layout-v2">
          <section aria-labelledby="results-heading">
            <div className="zyara-results-header">
              <div><span className="zyara-card-kicker">{specialty ? (ar ? specialty.nameAr : specialty.name) : (searchText || (ar ? "كل الرعاية" : "All care"))}</span><h2 id="results-heading">{ar ? "أفضل التطابقات في نطاقك" : "Best matches in your area"}</h2></div>
              <span className="zyara-demo-note">Synthetic preview data</span>
            </div>

            {showPlaces ? (
              <div className="zyara-result-section">
                <div className="zyara-list-heading"><h3>{ar ? "العيادات والمستشفيات" : "Clinics & hospitals"}</h3><span>{places.length}</span></div>
                <div className="zyara-results">
                  {places.map((place) => (
                    <article className="zyara-card zyara-care-card" key={place.id}>
                      <div className="zyara-place-thumb zyara-place-thumb-lg" aria-hidden="true">{place.kind.toUpperCase()}</div>
                      <div className="zyara-care-card-main">
                        <div className="zyara-card-top"><div><div className="zyara-card-kicker">{place.area} · {place.verified ? (ar ? "ملف مؤكد" : "Profile confirmed") : (ar ? "غير مؤكد" : "Unconfirmed")}</div><h3>{place.name}</h3></div><span className="zyara-distance">⌖ {place.distanceKm} km · {place.driveMinutes} min</span></div>
                        <div className="zyara-meta"><span>★ {place.rating} ({place.reviews} {ar ? "تقييم منشأة" : "facility reviews"})</span><span>{place.doctors} {ar ? "طبيب" : "doctors"}</span><span>{place.insurers.slice(0, 3).join(" · ")}</span></div>
                        <div className="zyara-tags">{place.specialties.slice(0, 3).map((item) => <span className="zyara-tag" key={item}>{item}</span>)}</div>
                        <div className="zyara-availability"><span className={place.openNow ? "zyara-positive" : ""}>● {place.openNow ? (ar ? "مفتوح الآن" : "Open now") : (ar ? "مغلق" : "Closed")}</span><span>{ar ? "يغلق" : "Closes"} {place.closesAt}</span><span>{ar ? "أقرب موعد" : "Next"}: {place.nextAvailable}</span></div>
                        <div className="zyara-card-actions zyara-contact-actions"><a className="zyara-secondary" href={`tel:${place.phone}`}>☎ {ar ? "اتصال" : "Call"}</a><a className="zyara-secondary" href={whatsappUrl(place)} target="_blank" rel="noreferrer">◔ WhatsApp</a><a className="zyara-secondary" href={directionsUrl(place)} target="_blank" rel="noreferrer">⌖ {ar ? "اتجاهات" : "Directions"}</a><a className="zyara-secondary" href={`/${active}/profiles/${place.id}`}>{ar ? "التفاصيل" : "Details"}</a><a className="zyara-primary" href={`/${active}/book?branch=${place.id}`}>{ar ? "احجز" : "Book"}</a></div>
                      </div>
                    </article>
                  ))}
                  {places.length === 0 ? <div className="zyara-empty-state"><strong>{ar ? "لم نجد منشأة مطابقة." : "No matching facility found."}</strong><span>{ar ? "جرّب تخصصًا أو خدمة أوسع." : "Try a broader specialty or service."}</span></div> : null}
                </div>
              </div>
            ) : null}

            {showDoctors ? (
              <div className="zyara-result-section">
                <div className="zyara-list-heading"><h3>{ar ? "الأطباء" : "Doctors"}</h3><span>{doctors.length}</span></div>
                <div className="zyara-doctor-results">
                  {doctors.map((doctor) => {
                    const facility = NEARBY_PLACES.find((place) => place.id === doctor.placeId);
                    return (
                      <article className="zyara-doctor-search-card" key={doctor.id}>
                        <div className="zyara-doctor-avatar zyara-doctor-avatar-lg" aria-hidden="true">MD</div>
                        <div className="zyara-doctor-search-main">
                          <div className="zyara-card-top"><div><span className="zyara-card-kicker">{doctor.title}</span><h3>{doctor.name}</h3><div className="zyara-meta"><span>{doctor.specialty}{doctor.subspecialty ? ` · ${doctor.subspecialty}` : ""}</span><span>{doctor.experienceYears} {ar ? "سنة خبرة" : "years experience"}</span></div></div><span className="zyara-distance">⌖ {doctor.distanceKm} km</span></div>
                          <div className="zyara-rating-split zyara-rating-split-inline"><div><span>{ar ? "تقييم الطبيب" : "Doctor rating"}</span><strong>★ {doctor.rating}</strong><small>{doctor.reviews}</small></div><div><span>{ar ? "تقييم المنشأة" : "Facility rating"}</span><strong>★ {facility?.rating ?? "—"}</strong><small>{facility?.name ?? doctor.placeName}</small></div></div>
                          <div className="zyara-tags">{doctor.languages.map((language) => <span className="zyara-tag" key={language}>{language}</span>)}<span className="zyara-tag">{doctor.locations.length} {ar ? "مواقع" : "locations"}</span></div>
                          <div className="zyara-availability"><span>{ar ? "أقرب موعد" : "Next"}: {doctor.nextAvailable}</span><span>{facility?.insurers.slice(0, 2).join(" · ")}</span></div>
                          <div className="zyara-card-actions"><a className="zyara-secondary" href={`/${active}/doctors/${doctor.id}`}>{ar ? "ملف الطبيب" : "Doctor profile"}</a><a className="zyara-primary" href={`/${active}/book?doctor=${doctor.id}`}>{ar ? "احجز موعدًا" : "Book appointment"}</a></div>
                        </div>
                      </article>
                    );
                  })}
                  {doctors.length === 0 ? <div className="zyara-empty-state"><strong>{ar ? "لم نجد طبيبًا مطابقًا." : "No matching doctor found."}</strong><span>{ar ? "يمكنك عرض المنشآت أو تجربة تخصص قريب." : "Try viewing facilities or a related specialty."}</span></div> : null}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="zyara-map-panel zyara-map-panel-search" role="application" aria-label="Nearby care map" data-renderer="maplibre" data-fallback="list">
            <div className="zyara-map-grid" aria-hidden="true" /><div className="zyara-map-road" aria-hidden="true" /><div className="zyara-map-road second" aria-hidden="true" /><div className="zyara-map-road third" aria-hidden="true" />
            <span className="zyara-pin p1" aria-hidden="true"><span>4.2</span></span><span className="zyara-pin p2" aria-hidden="true"><span>2.4</span></span><span className="zyara-pin p3" aria-hidden="true"><span>4.7</span></span><span className="zyara-pin p4" aria-hidden="true"><span>4.6</span></span><span className="zyara-you" aria-label="Your approximate location" />
            <div className="zyara-map-toolbar"><a className="zyara-secondary" href={`/${active}/map`}>{ar ? "فتح الخريطة" : "Open map"}</a><span className="zyara-location-chip">⌖ {ar ? "موقعي التقريبي" : "Approximate location"}</span></div>
            <div className="zyara-map-place"><article className="zyara-floating-card"><div className="zyara-place-thumb" aria-hidden="true">CARE</div><div><h3>{NEARBY_PLACES[0].name}</h3><div className="zyara-meta"><span>★ {NEARBY_PLACES[0].rating}</span><span>{NEARBY_PLACES[0].distanceKm} km · {NEARBY_PLACES[0].driveMinutes} min</span><span className="zyara-positive">● {ar ? "مفتوح" : "Open"}</span></div></div><a className="zyara-primary" href={directionsUrl(NEARBY_PLACES[0])} target="_blank" rel="noreferrer">{ar ? "اذهب" : "Go"} ↗</a></article></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
