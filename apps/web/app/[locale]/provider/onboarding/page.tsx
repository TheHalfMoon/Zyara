import { isSupportedLocale } from "@zyara/domain";
import { translate } from "@zyara/i18n";

// Synthetic service onboarding form (M009). Draft-first: every field optional
// on screen; publish gating happens server-side via validateForPublish.
export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  return (
    <main>
      <h1>{translate(active, "common.confirm")}</h1>
      <form aria-label="service-onboarding">
        <label htmlFor="svc-name">Service</label>
        <input id="svc-name" name="service" type="text" required aria-required="true" />
        <label htmlFor="svc-duration">Duration (minutes)</label>
        <input id="svc-duration" name="durationMin" type="number" min={1} required aria-required="true" />
        <label htmlFor="svc-consent">
          <input id="svc-consent" name="consent" type="checkbox" />
          {translate(active, "consent.explicit")}
        </label>
        <button type="submit">{translate(active, "common.confirm")}</button>
      </form>
    </main>
  );
}
