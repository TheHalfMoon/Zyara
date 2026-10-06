import { isSupportedLocale } from "@zyara/domain";
import { NEARBY_DOCTORS, NEARBY_PLACES, SPECIALTIES, directionsUrl, whatsappUrl } from "./discovery-data";

const COPY = {
  ar: {
    eyebrow: "بوابتك الأولى للرعاية الصحية",
    title: "الرعاية تبدأ من هنا.",
    subtitle: "ابحث أو تكلم مع Zyara. اكتشف الأطباء والعيادات الأقرب لك، وقارن التخصص والمسافة والدوام والتأمين والتقييمات قبل أن تتصل أو تذهب أو تحجز.",
    search: "طبيب، عيادة، تخصص، خدمة أو ما تحتاجه...",
    location: "الرياض",
    searchButton: "ابحث",
    ask: "تحدث إلى Zyara",
    specialties: "ابدأ بالتخصص",
    specialtiesSub: "إذا كنت تعرف ما تحتاجه، ابدأ مباشرة من التخصص أو الخدمة.",
    nearTitle: "رعاية قريبة منك الآن",
    nearSubtitle: "المسافة والدوام والتواصل تظهر قبل أن تضيع وقتك.",
    directions: "الاتجاهات",
    call: "اتصال",
    whatsapp: "واتساب",
    book: "احجز",
    profile: "التفاصيل",
    open: "مفتوح الآن",
    closes: "يغلق",
    next: "أقرب موعد",
    doctors: "أطباء قريبون يمكنك مقارنتهم",
    why: "لماذا Zyara؟",
    forClinics: "هل تمثل عيادة أو مستشفى؟",
    forClinicsSub: "طالب بملف منشأتك، حدّث الأطباء والتخصصات والدوام والتأمين وقنوات التواصل من مكان واحد.",
    claim: "ابدأ كمنشأة",
  },
  en: {
    eyebrow: "Your first door to healthcare",
    title: "Care starts here.",
    subtitle: "Search or speak to Zyara. Find nearby doctors and healthcare places, then compare specialty fit, distance, hours, insurance and reputation before you call, go or book.",
    search: "Doctor, clinic, specialty, service, or what you need...",
    location: "Riyadh",
    searchButton: "Search",
    ask: "Talk to Zyara",
    specialties: "Start with a specialty",
    specialtiesSub: "Know what you need? Jump straight into a specialty or service.",
    nearTitle: "Care near you, right now",
    nearSubtitle: "Distance, opening hours and contact options appear before you waste time.",
    directions: "Directions",
    call: "Call",
    whatsapp: "WhatsApp",
    book: "Book",
    profile: "Details",
    open: "Open now",
    closes: "Closes",
    next: "Next",
    doctors: "Nearby doctors you can actually compare",
    why: "Why Zyara",
    forClinics: "Represent a clinic or hospital?",
    forClinicsSub: "Claim your profile and keep doctors, specialties, hours, insurance and contact channels current from one place.",
    claim: "Start as a provider",
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
  const ar = active === "ar";
  const copy = ar ? COPY.ar : COPY.en;
  const featured = NEARBY_PLACES[0];

  return (
    <main className="zyara-shell" lang={active} dir={ar ? "rtl" : "ltr"}>
      <nav className="zyara-nav" aria-label="Primary navigation">
        <Brand locale={active} />
        <div className="zyara-nav-links">
          <a className="zyara-nav-link" href={`/${active}/search`}>{ar ? "اكتشف" : "Find care"}</a>
          <a className="zyara-nav-link" href={`/${active}/specialties`}>{ar ? "التخصصات" : "Specialties"}</a>
          <a className="zyara-nav-link" href={`/${active}/map`}>{ar ? "الخريطة" : "Map"}</a>
          <a className="zyara-nav-link zyara-nav-provider" href={`/${active}/provider`}>{ar ? "للمنشآت" : "For clinics"}</a>
          <span className="zyara-language-chip">{active.toUpperCase()}</span>
          <span className="zyara-location-chip">⌖ {copy.location}</span>
        </div>
      </nav>

      <section className="zyara-hero zyara-hero-v2" aria-labelledby="hero-title">
        <div className="zyara-hero-copy">
          <div>
            <span className="zyara-eyebrow">{copy.eyebrow}</span>
            <h1 id="hero-title">{copy.title}</h1>
            <p>{copy.subtitle}</p>
            <form className="zyara-searchbar zyara-searchbar-ai" action={`/${active}/search`} method="get" aria-label="Care search">
              <span className="zyara-ai-orb" aria-hidden="true">Z</span>
              <input name="text" type="search" placeholder={copy.search} aria-label={copy.search} />
              <a className="zyara-voice-button" href={`/${active}/search?mode=voice`} aria-label={copy.ask}>⌁ {copy.ask}</a>
              <button className="zyara-primary" type="submit">{copy.searchButton} →</button>
            </form>
            <div className="zyara-quick-chips" aria-label="Popular care searches">
              {(ar ? ["عظام", "أسنان", "جلدية", "أطفال", "أشعة MRI"] : ["Orthopedics", "Dentist", "Dermatology", "Pediatrics", "MRI"]).map((label) => (
                <a key={label} className="zyara-chip" href={`/${active}/search?text=${encodeURIComponent(label)}`}>{label}</a>
              ))}
            </div>
          </div>
          <div className="zyara-hero-proof">
            <span>⌖ {ar ? "الأقرب أولاً" : "Nearby first"}</span>
            <span>★ {ar ? "تقييم الطبيب منفصل عن المنشأة" : "Doctor and facility ratings stay separate"}</span>
            <span>↗ {ar ? "اتصال · واتساب · اتجاهات · حجز" : "Call · WhatsApp · Directions · Book"}</span>
          </div>
          <span className="zyara-demo-note">Preview experience uses rights-cleared synthetic provider data.</span>
        </div>

        <div className="zyara-hero-visual" aria-label="Nearby care map preview">
          <div className="zyara-hero-map-grid" aria-hidden="true" />
          <div className="zyara-map-road" aria-hidden="true" />
          <div className="zyara-map-road second" aria-hidden="true" />
          <div className="zyara-map-road third" aria-hidden="true" />
          <span className="zyara-pin p1" aria-hidden="true"><span>4.2</span></span>
          <span className="zyara-pin p2" aria-hidden="true"><span>2.4</span></span>
          <span className="zyara-pin p3" aria-hidden="true"><span>4.7</span></span>
          <span className="zyara-pin p4" aria-hidden="true"><span>4.6</span></span>
          <span className="zyara-you" aria-label="Your approximate location" />
          <div className="zyara-map-caption">{ar ? "خيارات رعاية حولك" : "Care options around you"}</div>
          <article className="zyara-floating-card zyara-floating-card-v2">
            <div className="zyara-place-thumb" aria-hidden="true">CARE</div>
            <div>
              <span className="zyara-card-kicker">{featured.area} · {featured.distanceKm} km</span>
              <h3>{featured.name}</h3>
              <div className="zyara-meta">
                <span>★ {featured.rating} ({featured.reviews})</span>
                <span>{featured.driveMinutes} min</span>
                <span className="zyara-positive">● {copy.open}</span>
                <span>{copy.closes} {featured.closesAt}</span>
              </div>
            </div>
            <a className="zyara-primary" href={directionsUrl(featured)} target="_blank" rel="noreferrer">{copy.directions} ↗</a>
          </article>
        </div>
      </section>

      <section className="zyara-section" aria-labelledby="specialties-title">
        <header className="zyara-section-head">
          <div><span className="zyara-eyebrow">{ar ? "ابحث بطريقتك" : "Browse your way"}</span><h2 id="specialties-title">{copy.specialties}</h2></div>
          <p>{copy.specialtiesSub}</p>
        </header>
        <div className="zyara-specialty-grid">
          {SPECIALTIES.slice(0, 8).map((specialty) => (
            <a className="zyara-specialty-card" key={specialty.slug} href={`/${active}/search?specialty=${specialty.slug}`}>
              <span className="zyara-specialty-icon" aria-hidden="true">{specialty.icon}</span>
              <div><strong>{ar ? specialty.nameAr : specialty.name}</strong><span>{ar ? specialty.descriptionAr : specialty.description}</span></div>
              <span className="zyara-specialty-arrow">→</span>
            </a>
          ))}
        </div>
        <div className="zyara-section-action"><a className="zyara-secondary" href={`/${active}/specialties`}>{ar ? "كل التخصصات والخدمات" : "All specialties & services"} →</a></div>
      </section>

      <section id="nearby" className="zyara-section" aria-labelledby="nearby-title">
        <header className="zyara-section-head">
          <div><span className="zyara-eyebrow">{ar ? "حولك" : "Near you"}</span><h2 id="nearby-title">{copy.nearTitle}</h2></div>
          <p>{copy.nearSubtitle}</p>
        </header>
        <div className="zyara-results zyara-home-results">
          {NEARBY_PLACES.slice(0, 3).map((place) => (
            <article className="zyara-card zyara-care-card" key={place.id}>
              <div className="zyara-place-thumb zyara-place-thumb-lg" aria-hidden="true">{place.kind.toUpperCase()}</div>
              <div className="zyara-care-card-main">
                <div className="zyara-card-top">
                  <div><div className="zyara-card-kicker">{place.area} · {place.verified ? (ar ? "تم تأكيد الملف" : "Profile confirmed") : (ar ? "غير مؤكد" : "Unconfirmed")}</div><h3>{place.name}</h3></div>
                  <span className="zyara-distance">⌖ {place.distanceKm} km · {place.driveMinutes} min</span>
                </div>
                <div className="zyara-meta"><span>★ {place.rating} · {place.reviews} {ar ? "تقييم منشأة" : "facility reviews"}</span><span>{place.doctors} {ar ? "طبيب" : "doctors"}</span><span>{place.insurers.slice(0, 2).join(" · ")}</span></div>
                <div className="zyara-tags">{place.specialties.slice(0, 3).map((specialty) => <span className="zyara-tag" key={specialty}>{specialty}</span>)}</div>
                <div className="zyara-availability"><span className="zyara-positive">● {copy.open}</span><span>{copy.closes} {place.closesAt}</span><span>{copy.next}: {place.nextAvailable}</span></div>
                <div className="zyara-card-actions zyara-contact-actions">
                  <a className="zyara-secondary" href={`tel:${place.phone}`}>☎ {copy.call}</a>
                  <a className="zyara-secondary" href={whatsappUrl(place)} target="_blank" rel="noreferrer">◔ {copy.whatsapp}</a>
                  <a className="zyara-secondary" href={directionsUrl(place)} target="_blank" rel="noreferrer">⌖ {copy.directions}</a>
                  <a className="zyara-secondary" href={`/${active}/profiles/${place.id}`}>{copy.profile}</a>
                  <a className="zyara-primary" href={`/${active}/book?branch=${place.id}`}>{copy.book}</a>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="zyara-section-action"><a className="zyara-secondary" href={`/${active}/search?type=clinic`}>{ar ? "عرض كل العيادات والمستشفيات" : "See all clinics & hospitals"} →</a></div>
      </section>

      <section className="zyara-section" aria-labelledby="doctors-title">
        <header className="zyara-section-head"><div><span className="zyara-eyebrow">{ar ? "قارن الطبيب والمكان" : "Compare doctor and place"}</span><h2 id="doctors-title">{copy.doctors}</h2></div><a className="zyara-secondary" href={`/${active}/search?type=doctor`}>{ar ? "كل الأطباء" : "All doctors"} →</a></header>
        <div className="zyara-doctors-grid zyara-doctors-grid-v2">
          {NEARBY_DOCTORS.slice(0, 4).map((doctor) => {
            const facility = NEARBY_PLACES.find((place) => place.id === doctor.placeId);
            return (
              <article className="zyara-doctor-card zyara-doctor-card-v2" key={doctor.id}>
                <div className="zyara-doctor-row"><div className="zyara-doctor-avatar" aria-hidden="true">MD</div><div><span className="zyara-card-kicker">{doctor.title}</span><h3>{doctor.name}</h3><div className="zyara-meta"><span>{doctor.specialty}{doctor.subspecialty ? ` · ${doctor.subspecialty}` : ""}</span></div></div></div>
                <div className="zyara-rating-split"><div><span>{ar ? "الطبيب" : "Doctor"}</span><strong>★ {doctor.rating}</strong><small>{doctor.reviews} {ar ? "تقييم" : "reviews"}</small></div><div><span>{ar ? "المنشأة" : "Facility"}</span><strong>★ {facility?.rating ?? "—"}</strong><small>{facility?.name ?? doctor.placeName}</small></div></div>
                <div className="zyara-meta"><span>⌖ {doctor.distanceKm} km</span><span>{doctor.experienceYears} {ar ? "سنة خبرة" : "years experience"}</span><span>{doctor.locations.length} {ar ? "مواقع عمل" : "practice locations"}</span></div>
                <div className="zyara-availability"><span>{copy.next}: {doctor.nextAvailable}</span></div>
                <div className="zyara-card-actions"><a className="zyara-secondary" href={`/${active}/doctors/${doctor.id}`}>{ar ? "ملف الطبيب" : "Doctor profile"}</a><a className="zyara-primary" href={`/${active}/book?doctor=${doctor.id}`}>{copy.book}</a></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="zyara-section zyara-trust-section" aria-labelledby="why-title">
        <div className="zyara-dark-panel">
          <span className="zyara-eyebrow zyara-eyebrow-light">{copy.why}</span>
          <h2 id="why-title">{ar ? "المعلومة الصحية المحلية يجب أن تكون واضحة، حديثة، ومفهومة." : "Local healthcare information should be clear, current and understandable."}</h2>
          <div className="zyara-trust-grid">
            <div><strong>{ar ? "الطبيب ≠ المنشأة" : "Doctor ≠ facility"}</strong><span>{ar ? "تقييم الطبيب لا يخفي تجربة سيئة في العيادة، والعكس صحيح." : "A great doctor never hides a poor facility experience, and vice versa."}</span></div>
            <div><strong>{ar ? "الحداثة ظاهرة" : "Freshness is visible"}</strong><span>{ar ? "نعرض متى تم تأكيد بيانات التواصل والدوام والتأمين." : "See when contact, hours and insurance information was last confirmed."}</span></div>
            <div><strong>{ar ? "AI فوق حقائق منظمة" : "AI over structured truth"}</strong><span>{ar ? "Zyara يفهم طلبك، لكن الحقائق تأتي من النظام المنظم لا من تخمين النموذج." : "Zyara can understand your request, but marketplace facts come from structured data, not model guesses."}</span></div>
          </div>
        </div>
      </section>

      <section className="zyara-provider-cta">
        <div><span className="zyara-eyebrow">Zyara for Clinics</span><h2>{copy.forClinics}</h2><p>{copy.forClinicsSub}</p></div>
        <a className="zyara-primary" href={`/${active}/provider`}>{copy.claim} →</a>
      </section>

      <footer className="zyara-footer"><Brand locale={active} /><span>People · Care · Communities · A brighter tomorrow</span><span>© 2026 Zyara</span></footer>
    </main>
  );
}
