import { isSupportedLocale } from "@zyara/domain";
import { translate } from "@zyara/i18n";

// Synthetic provider verification status page (M008). No real credentials;
// shows claim states and badge scope with five-locale explanations.
export default async function VerifyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  return (
    <main>
      <h1>{translate(active, "common.confirm")}</h1>
      <form aria-label="verification-status">
        <label htmlFor="claim-id">Claim</label>
        <input id="claim-id" name="claim" type="text" required aria-required="true" />
        <button type="submit">{translate(active, "common.retry")}</button>
      </form>
    </main>
  );
}
