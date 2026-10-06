import { isSupportedLocale } from "@zyara/domain";
import { SPECIALTIES } from "../discovery-data";

export default async function SpecialtiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  const ar = active === "ar";

  return (
    <main className="zyara-shell" lang={active} dir={ar ? "rtl" : "ltr"}>
      <nav className="zyara-nav" aria-label="Primary navigation">
        <a className="zyara-brand" href={`/${active}`} aria-label="Zyara home"><span className="zyara-mark" aria-hidden="true">Z</span><span className="zyara-wordmark">Zyara</span></a>
        <div className="zyara-nav-links"><a className="zyara-nav-link" href={`/${active}/search`}>{ar ? "اكتشف" : "Find care"}</a><a className="zyara-nav-link" href={`/${active}/map`}>{ar ? "الخريطة" : "Map"}</a><span className="zyara-location-chip">⌖ {ar ? "الرياض" : "Riyadh"}</span></div>
      </nav>

      <section className="zyara-page">
        <header className="zyara-page-head zyara-specialties-head">
          <span className="zyara-eyebrow">{ar ? "ابدأ بما تعرفه" : "Start with what you know"}</span>
          <h1 className="zyara-page-title">{ar ? "تخصصات وخدمات الرعاية." : "Specialties and care services."}</h1>
          <p className="zyara-page-subtitle">{ar ? "اختر تخصصًا مباشرة، أو استخدم بحث Zyara إذا كنت تعرف الخدمة أو وصفت احتياجك بكلماتك." : "Choose a specialty directly, or use Zyara search when you know a service or want to describe what you need in your own words."}</p>
          <form className="zyara-searchbar zyara-searchbar-ai zyara-searchbar-wide" action={`/${active}/search`} method="get">
            <span className="zyara-ai-orb" aria-hidden="true">Z</span>
            <input name="text" type="search" placeholder={ar ? "عظام، تقويم أسنان، MRI، دكتور أطفال..." : "Orthopedics, braces, MRI, pediatrician..."} aria-label={ar ? "بحث التخصصات والخدمات" : "Search specialties and services"} />
            <a className="zyara-voice-button" href={`/${active}/search?mode=voice`}>⌁ {ar ? "تكلم" : "Speak"}</a>
            <button className="zyara-primary" type="submit">{ar ? "بحث" : "Search"} →</button>
          </form>
        </header>

        <div className="zyara-specialty-directory">
          {SPECIALTIES.map((specialty) => (
            <a className="zyara-specialty-directory-card" href={`/${active}/search?specialty=${specialty.slug}`} key={specialty.slug}>
              <span className="zyara-specialty-icon zyara-specialty-icon-lg" aria-hidden="true">{specialty.icon}</span>
              <div><span className="zyara-card-kicker">{specialty.name}</span><h2>{ar ? specialty.nameAr : specialty.name}</h2><p>{ar ? specialty.descriptionAr : specialty.description}</p><div className="zyara-tags">{specialty.aliases.slice(0, 4).map((alias) => <span className="zyara-tag" key={alias}>{alias}</span>)}</div></div>
              <span className="zyara-specialty-arrow">→</span>
            </a>
          ))}
        </div>

        <section className="zyara-dark-panel zyara-specialty-ai-panel">
          <span className="zyara-eyebrow zyara-eyebrow-light">{ar ? "لا تعرف التخصص؟" : "Not sure which specialty to browse?"}</span>
          <h2>{ar ? "صف ما تبحث عنه، وZyara يحوله إلى بحث منظم — بدون تشخيص." : "Describe what you are looking for and Zyara turns it into structured search — without diagnosing you."}</h2>
          <p>{ar ? "مثال: «أبي دكتور ركبة قريب ويقبل بوبا بعد 6» يصبح بحثًا في العظام + الموقع + التأمين + الوقت." : "Example: “knee doctor near me, Bupa, after 6” becomes a structured search across specialty, location, insurance and time."}</p>
          <a className="zyara-primary zyara-primary-light" href={`/${active}/search`}>{ar ? "اسأل Zyara" : "Ask Zyara"} →</a>
        </section>
      </section>
    </main>
  );
}
