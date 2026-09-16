import { isSupportedLocale } from "@zyara/domain";
import { NEARBY_DOCTORS, NEARBY_PLACES, directionsUrl } from "./discovery-data";

const COPY = {
  ar: {
    eyebrow: "رعاية صحية أقرب إليك",
    title: "رعاية أفضل، أقرب مما تتوقع.",
    subtitle: "اكتشف العيادات والأطباء القريبين منك، اعرف المسافة وساعات العمل، احصل على الاتجاهات، واحجز بثقة.",
    search: "ابحث عن طبيب، عيادة، تخصص أو عرض...",
    location: "الرياض",
    searchButton: "بحث",
    nearTitle: "العيادات والأطباء بالقرب منك",
    nearSubtitle: "الترتيب حسب المسافة مع إظهار حالة الدوام، وقت الوصول، وأقرب موعد متاح.",
    viewAll: "عرض الكل",
    directions: "الاتجاهات",
    book: "احجز موعدًا",
    profile: "عرض التفاصيل",
    open: "مفتوح الآن",
    closes: "يغلق",
    next: "أقرب موعد",
    doctors: "أطباء قريبون",
    trust1: "موقع أولاً",
    trust1b: "المسافة ووقت الوصول واضحان قبل الحجز.",
    trust2: "ساعات عمل واضحة",
    trust2b: "اعرف إن كان المكان مفتوحًا ومتى يغلق.",
    trust3: "اتجاهات بنقرة",
    trust3b: "افتح المسار مباشرة في تطبيق الخرائط.",
    trust4: "حجز موثوق",
    trust4b: "وضع الحجز والموعد التالي يظهران بوضوح.",
  },
  en: {
    eyebrow: "Healthcare access, reimagined",
    title: "Better care, closer to you.",
    subtitle: "See nearby clinics and doctors, compare distance and opening hours, get directions, and book care with confidence.",
    search: "Search doctors, clinics, specialties, or symptoms...",
    location: "Riyadh",
    searchButton: "Search",
    nearTitle: "Clinics & doctors near you",
    nearSubtitle: "Distance-first discovery with live-style opening context, travel time, and the next available appointment.",
    viewAll: "View all",
    directions: "Directions",
    book: "Book appointment",
    profile: "View details",
    open: "Open now",
    closes: "Closes",
    next: "Next",
    doctors: "Doctors near you",
    trust1: "Location first",
    trust1b: "See distance and travel time before you book.",
    trust2: "Working hours",
    trust2b: "Know whether a clinic is open and when it closes.",
    trust3: "One-tap directions",
    trust3b: "Open a route directly in your maps app.",
    trust4: "Booking clarity",
    trust4b: "See booking mode and the next available time up front.",
  },
} as const;

function Brand({ locale }: { locale: string }) {
  return (
    <a className="zyara-brand" href={`/${locale}`} aria-label="Zyara home">
      <span className="zyara-mark" aria-hidden="true">Z</span>
      <span className="zyara-wordmark">Zyara</span>
    </a>
  );
}

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  const copy = active === "ar" ? COPY.ar : COPY.en;
  const featured = NEARBY_PLACES[0];

  return (
    <main className="zyara-shell" lang={active} dir={active === "ar" ? "rtl" : "ltr"}>
      <nav className="zyara-nav" aria-label="Primary navigation">
        <Brand locale={active} />
        <div className="zyara-nav-links">
          <a className="zyara-nav-link" href={`/${active}/search`}>Find care</a>
          <a className="zyara-nav-link" href={`/${active}/map`}>Map</a>
          <a className="zyara-nav-link" href="#nearby">For patients</a>
          <span className="zyara-language-chip">{active.toUpperCase()}</span>
          <span className="zyara-location-chip">⌖ {copy.location}</span>
          <a className="zyara-primary" href={`/${active}/search`}>{copy.searchButton} →</a>
        </div>
      </nav>

      <section className="zyara-hero" aria-labelledby="hero-title">
        <div className="zyara-hero-copy">
          <div>
            <span className="zyara-eyebrow">{copy.eyebrow}</span>
            <h1 id="hero-title">{copy.title}</h1>
            <p>{copy.subtitle}</p>
            <form className="zyara-searchbar" action={`/${active}/search`} method="get" aria-label="Care search">
              <input name="text" type="search" placeholder={copy.search} aria-label={copy.search} />
              <span className="zyara-location-chip">⌖ {copy.location}</span>
              <button className="zyara-primary" type="submit">{copy.searchButton} →</button>
            </form>
            <div className="zyara-quick-chips" aria-label="Popular specialties">
              {['General Practice', 'Dentist', 'Dermatology', 'Pediatrics', 'Cardiology'].map((label) => (
                <a key={label} className="zyara-chip" href={`/${active}/search?text=${encodeURIComponent(label)}`}>{label}</a>
              ))}
            </div>
          </div>
          <span className="zyara-demo-note">Preview experience uses rights-cleared synthetic provider data.</span>
        </div>

        <div className="zyara-hero-visual" aria-label="Nearby care map preview">
          <div className="zyara-hero-map-grid" aria-hidden="true" />
          <div className="zyara-map-road" aria-hidden="true" />
          <div className="zyara-map-road second" aria-hidden="true" />
          <div className="zyara-map-road third" aria-hidden="true" />
          <span className="zyara-pin p1" aria-hidden="true"><span>4.8</span></span>
          <span className="zyara-pin p2" aria-hidden="true"><span>4.7</span></span>
          <span className="zyara-pin p3" aria-hidden="true"><span>4.9</span></span>
          <span className="zyara-pin p4" aria-hidden="true"><span>4.6</span></span>
          <span className="zyara-you" aria-label="Your approximate location" />
          <article className="zyara-floating-card">
            <div className="zyara-place-thumb" aria-hidden="true">CARE</div>
            <div>
              <h3>{featured.name}</h3>
              <div className="zyara-meta">
                <span>★ {featured.rating} ({featured.reviews})</span>
                <span>{featured.distanceKm} km · {featured.driveMinutes} min</span>
                <span className="zyara-positive">● {copy.open}</span>
                <span>{copy.closes} {featured.closesAt}</span>
              </div>
            </div>
            <a className="zyara-primary" href={directionsUrl(featured)} target="_blank" rel="noreferrer">{copy.directions} ↗</a>
          </article>
        </div>
      </section>

      <section id="nearby" className="zyara-section" aria-labelledby="nearby-title">
        <header className="zyara-section-head">
          <div>
            <span className="zyara-eyebrow">Near you</span>
            <h2 id="nearby-title">{copy.nearTitle}</h2>
          </div>
          <p>{copy.nearSubtitle}</p>
        </header>

        <div className="zyara-discovery-layout">
          <div className="zyara-results" aria-label="Nearby clinics and hospitals">
            {NEARBY_PLACES.slice(0, 3).map((place) => (
              <article className="zyara-card" key={place.id}>
                <div className="zyara-place-thumb" aria-hidden="true">{place.kind.toUpperCase()}</div>
                <div>
                  <div className="zyara-card-top">
                    <div>
                      <div className="zyara-card-kicker">{place.area} · {place.verified ? 'Verified' : 'Unverified'}</div>
                      <h3>{place.name}</h3>
                    </div>
                    <span className="zyara-distance">⌖ {place.distanceKm} km · {place.driveMinutes} min</span>
                  </div>
                  <div className="zyara-meta">
                    <span>★ {place.rating} ({place.reviews})</span>
                    <span>{place.address}</span>
                    <span>{place.doctors} doctors</span>
                  </div>
                  <div className="zyara-tags">
                    {place.specialties.map((specialty) => <span className="zyara-tag" key={specialty}>{specialty}</span>)}
                  </div>
                  <div className="zyara-availability">
                    <span className="zyara-positive">● {copy.open}</span>
                    <span>{copy.closes} {place.closesAt}</span>
                    <span>{copy.next}: {place.nextAvailable}</span>
                  </div>
                  <div className="zyara-card-actions">
                    <a className="zyara-secondary" href={`/${active}/profiles/${place.id}`}>{copy.profile}</a>
                    <a className="zyara-secondary" href={directionsUrl(place)} target="_blank" rel="noreferrer">{copy.directions} ↗</a>
                    <a className="zyara-primary" href={`/${active}/book?branch=${place.id}`}>{copy.book}</a>
                  </div>
                </div>
              </article>
            ))}
            <a className="zyara-secondary" href={`/${active}/search`}>{copy.viewAll} →</a>
          </div>

          <div className="zyara-map-panel" role="application" aria-label="Nearby care map" data-renderer="maplibre" data-fallback="list">
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
              <a className="zyara-secondary" href={`/${active}/map`}>Map view</a>
              <span className="zyara-location-chip">⌖ {copy.location}</span>
            </div>
            <div className="zyara-map-place">
              <article className="zyara-floating-card">
                <div className="zyara-place-thumb" aria-hidden="true">CARE</div>
                <div>
                  <h3>{featured.name}</h3>
                  <div className="zyara-meta">
                    <span>★ {featured.rating}</span>
                    <span>{featured.distanceKm} km · {featured.driveMinutes} min</span>
                    <span className="zyara-positive">● {copy.open}</span>
                  </div>
                </div>
                <a className="zyara-primary" href={directionsUrl(featured)} target="_blank" rel="noreferrer">{copy.directions} ↗</a>
              </article>
            </div>
          </div>
        </div>

        <div className="zyara-trust-strip" aria-label="Discovery principles">
          <div className="zyara-trust-item"><strong>{copy.trust1}</strong><span>{copy.trust1b}</span></div>
          <div className="zyara-trust-item"><strong>{copy.trust2}</strong><span>{copy.trust2b}</span></div>
          <div className="zyara-trust-item"><strong>{copy.trust3}</strong><span>{copy.trust3b}</span></div>
          <div className="zyara-trust-item"><strong>{copy.trust4}</strong><span>{copy.trust4b}</span></div>
        </div>
      </section>

      <section className="zyara-section" aria-labelledby="doctors-title">
        <header className="zyara-section-head">
          <h2 id="doctors-title">{copy.doctors}</h2>
          <a className="zyara-secondary" href={`/${active}/search?type=doctor`}>{copy.viewAll} →</a>
        </header>
        <div className="zyara-doctors-grid">
          {NEARBY_DOCTORS.map((doctor) => (
            <article className="zyara-doctor-card" key={doctor.id}>
              <div className="zyara-doctor-row">
                <div className="zyara-doctor-avatar" aria-hidden="true">MD</div>
                <div>
                  <h3>{doctor.name}</h3>
                  <div className="zyara-meta"><span>{doctor.specialty}</span><span>★ {doctor.rating} ({doctor.reviews})</span></div>
                </div>
              </div>
              <div className="zyara-meta"><span>{doctor.placeName}</span><span>{doctor.distanceKm} km away</span></div>
              <div className="zyara-tags">{doctor.languages.map((language) => <span className="zyara-tag" key={language}>{language}</span>)}</div>
              <div className="zyara-availability"><span>{copy.next}: {doctor.nextAvailable}</span></div>
              <div className="zyara-card-actions"><a className="zyara-primary" href={`/${active}/book?doctor=${doctor.id}`}>{copy.book}</a></div>
            </article>
          ))}
        </div>
      </section>

      <footer className="zyara-footer">
        <Brand locale={active} />
        <span>People · Care · Communities · A brighter tomorrow</span>
        <span>© 2026 Zyara</span>
      </footer>
    </main>
  );
}
