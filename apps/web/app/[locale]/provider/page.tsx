import { isSupportedLocale } from "@zyara/domain";
import { doctorsForPlace, NEARBY_PLACES } from "../discovery-data";

export default async function ProviderPortalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  const ar = active === "ar";
  const place = NEARBY_PLACES[0];
  const doctors = doctorsForPlace(place.id);

  return (
    <main className="zyara-shell" lang={active} dir={ar ? "rtl" : "ltr"}>
      <nav className="zyara-nav" aria-label="Provider navigation">
        <a className="zyara-brand" href={`/${active}`} aria-label="Zyara home"><span className="zyara-mark" aria-hidden="true">Z</span><span className="zyara-wordmark">Zyara</span></a>
        <div className="zyara-nav-links"><span className="zyara-nav-link zyara-nav-current">{ar ? "بوابة المنشأة" : "Clinic Portal"}</span><a className="zyara-nav-link" href={`/${active}/provider/onboarding`}>{ar ? "إضافة/مطالبة منشأة" : "Claim a clinic"}</a><a className="zyara-nav-link" href={`/${active}/search`}>{ar ? "معاينة البحث" : "View patient search"}</a></div>
      </nav>

      <section className="zyara-page zyara-provider-page">
        <header className="zyara-provider-head">
          <div><span className="zyara-eyebrow">Zyara for Clinics · {ar ? "واجهة تجريبية" : "UI preview"}</span><h1 className="zyara-page-title">{place.name}</h1><p className="zyara-page-subtitle">{ar ? "حافظ على ملف المنشأة والأطباء والتخصصات والدوام والتأمين وقنوات التواصل حديثة حتى يثق المرضى بما يشاهدونه." : "Keep your clinic, doctors, specialties, hours, insurance and contact channels current so patients can trust what they see."}</p></div>
          <div className="zyara-provider-head-actions"><span className="zyara-positive">● {ar ? "الملف ظاهر للمرضى" : "Profile visible to patients"}</span><a className="zyara-primary" href={`/${active}/profiles/${place.id}`}>{ar ? "عرض الملف العام" : "View public profile"} ↗</a></div>
        </header>

        <div className="zyara-provider-stat-grid">
          <div><span>{ar ? "اكتمال الملف" : "Profile completeness"}</span><strong>86%</strong><small>{ar ? "4 عناصر تحتاج مراجعة" : "4 items need attention"}</small></div>
          <div><span>{ar ? "الأطباء الحاليون" : "Current doctors"}</span><strong>{place.doctors}</strong><small>{ar ? `${doctors.length} ملفات تجريبية مرتبطة` : `${doctors.length} synthetic profiles linked`}</small></div>
          <div><span>{ar ? "آخر تأكيد" : "Last attestation"}</span><strong>{place.freshnessDays}d</strong><small>{ar ? "قبل انتهاء نافذة 30 يومًا" : "inside the 30-day target"}</small></div>
          <div><span>{ar ? "تقييم المنشأة" : "Facility reputation"}</span><strong>★ {place.rating}</strong><small>{place.reviews} {ar ? "تقييم تجريبي" : "synthetic reviews"}</small></div>
        </div>

        <div className="zyara-provider-layout">
          <div className="zyara-provider-main-column">
            <section className="zyara-panel zyara-provider-attestation">
              <div className="zyara-list-heading"><div><span className="zyara-card-kicker">{ar ? "التأكيد الشهري" : "Monthly attestation"}</span><h2>{ar ? "4 عناصر تحتاج تأكيدًا" : "4 items need confirmation"}</h2></div><span className="zyara-warning-pill">{ar ? "مطلوب هذا الشهر" : "Due this month"}</span></div>
              <div className="zyara-attestation-list">
                <div><div><strong>{ar ? "قائمة الأطباء" : "Doctor roster"}</strong><span>{ar ? "تأكد أن الأطباء ما زالوا يعملون في هذا الفرع." : "Confirm every practitioner still works at this branch."}</span></div><button className="zyara-secondary" type="button">{ar ? "مراجعة" : "Review"}</button></div>
                <div><div><strong>WhatsApp</strong><span>{place.whatsapp} · {ar ? `تم التأكيد قبل ${place.freshnessDays} أيام` : `confirmed ${place.freshnessDays} days ago`}</span></div><button className="zyara-secondary" type="button">{ar ? "تأكيد" : "Confirm"}</button></div>
                <div><div><strong>{ar ? "التأمين" : "Insurance networks"}</strong><span>{place.insurers.join(" · ")}</span></div><button className="zyara-secondary" type="button">{ar ? "مراجعة" : "Review"}</button></div>
                <div><div><strong>{ar ? "ساعات الجمعة" : "Friday hours"}</strong><span>{place.hours.find((row) => row.day === "Friday")?.hours ?? "—"}</span></div><button className="zyara-secondary" type="button">{ar ? "تأكيد" : "Confirm"}</button></div>
              </div>
            </section>

            <section className="zyara-panel">
              <div className="zyara-list-heading"><div><span className="zyara-card-kicker">{ar ? "الفريق الطبي" : "Practitioner roster"}</span><h2>{ar ? "الأطباء والارتباطات" : "Doctors & affiliations"}</h2></div><button className="zyara-primary" type="button">＋ {ar ? "إضافة طبيب" : "Add doctor"}</button></div>
              <div className="zyara-provider-roster">
                {doctors.map((doctor) => (
                  <div key={doctor.id}>
                    <div className="zyara-doctor-row"><div className="zyara-doctor-avatar" aria-hidden="true">MD</div><div><strong>{doctor.name}</strong><span>{doctor.title}</span></div></div>
                    <span>{doctor.specialty}</span><span className="zyara-positive">● {ar ? "نشط" : "Active"}</span><span>{doctor.freshnessDays}d</span><a href={`/${active}/doctors/${doctor.id}`}>{ar ? "معاينة" : "Preview"} ↗</a>
                  </div>
                ))}
                <div className="zyara-roster-placeholder"><div className="zyara-doctor-row"><div className="zyara-doctor-avatar" aria-hidden="true">MD</div><div><strong>{ar ? "9 أطباء إضافيين" : "9 additional doctors"}</strong><span>{ar ? "تحتاج ملفاتهم إلى إكمال أو ربط" : "Need profile completion or linking"}</span></div></div><span>—</span><span className="zyara-warning-text">{ar ? "مراجعة" : "Review"}</span><span>—</span><button className="zyara-ghost" type="button">{ar ? "فتح" : "Open"}</button></div>
              </div>
            </section>

            <section className="zyara-panel">
              <div className="zyara-list-heading"><div><span className="zyara-card-kicker">{ar ? "التخصصات والخدمات" : "Specialties & services"}</span><h2>{ar ? "ما الذي يجده المرضى؟" : "What can patients find here?"}</h2></div><button className="zyara-secondary" type="button">{ar ? "إدارة" : "Manage"}</button></div>
              <div className="zyara-provider-taxonomy"><div><span>{ar ? "التخصصات" : "Specialties"}</span><div className="zyara-tags">{place.specialties.map((item) => <span className="zyara-tag" key={item}>{item}</span>)}</div></div><div><span>{ar ? "الخدمات" : "Services"}</span><div className="zyara-tags">{place.services.map((item) => <span className="zyara-tag" key={item}>{item}</span>)}</div></div></div>
            </section>
          </div>

          <aside className="zyara-provider-side-column">
            <section className="zyara-panel">
              <span className="zyara-card-kicker">{ar ? "قنوات التواصل" : "Contact channels"}</span><h2>{ar ? "كيف يصل إليك المرضى" : "How patients reach you"}</h2>
              <div className="zyara-contact-admin-list"><div><span>☎</span><div><strong>{ar ? "الهاتف الرئيسي" : "Main phone"}</strong><small>{place.phone}</small></div><em>{place.freshnessDays}d</em></div><div><span>☎</span><div><strong>{ar ? "هاتف الحجز" : "Booking phone"}</strong><small>{place.bookingPhone}</small></div><em>{place.freshnessDays}d</em></div><div><span>◔</span><div><strong>WhatsApp</strong><small>{place.whatsapp}</small></div><em>{place.freshnessDays}d</em></div><div><span>↗</span><div><strong>{ar ? "الموقع الإلكتروني" : "Website"}</strong><small>{place.website}</small></div><em>{place.freshnessDays}d</em></div></div>
            </section>

            <section className="zyara-panel">
              <span className="zyara-card-kicker">{ar ? "قيمة الاكتشاف" : "Discovery analytics"}</span><h2>{ar ? "هذا الشهر" : "This month"}</h2>
              <div className="zyara-provider-mini-metrics"><div><strong>2,418</strong><span>{ar ? "ظهور في البحث" : "search impressions"}</span></div><div><strong>611</strong><span>{ar ? "مشاهدة للملف" : "profile views"}</span></div><div><strong>184</strong><span>{ar ? "ضغط اتجاهات" : "direction clicks"}</span></div><div><strong>96</strong><span>{ar ? "اتصال/واتساب" : "call / WhatsApp clicks"}</span></div></div>
              <p className="zyara-demo-note">{ar ? "أرقام تجريبية للواجهة فقط. الضغط لا يساوي زيارة فعلية." : "Synthetic UI metrics only. A click is not a completed visit."}</p>
            </section>

            <section className="zyara-panel">
              <span className="zyara-card-kicker">{ar ? "السمعة" : "Reputation"}</span><div className="zyara-review-summary"><strong>★ {place.rating}</strong><span>{place.reviews} {ar ? "تقييم منشأة" : "facility reviews"}</span></div><p className="zyara-small-copy">{ar ? "تقييم المنشأة مستقل عن تقييم كل طبيب. يمكن الرد على المراجعات المسموح بها، وليس حذفها لمجرد أنها سلبية." : "Facility reputation is separate from every doctor score. Providers may reply to compliant reviews, not remove them simply for being negative."}</p><button className="zyara-secondary" type="button">{ar ? "عرض المراجعات" : "View reviews"}</button>
            </section>
          </aside>
        </div>

        <p className="zyara-demo-note">Clinic Portal preview uses synthetic provider data and metrics. No real clinic account, analytics, review volume or operational status is claimed.</p>
      </section>
    </main>
  );
}
