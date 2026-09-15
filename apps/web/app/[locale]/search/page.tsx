import { isSupportedLocale } from "@zyara/domain";
import { translate } from "@zyara/i18n";

// Synthetic search page (M011). Filter relaxation requires explicit choice:
// the relax checkbox is unchecked by default and submitted by the patient.
export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const active = isSupportedLocale(locale) ? locale : "ar";
  return (
    <main>
      <h1>{translate(active, "common.confirm")}</h1>
      <form aria-label="provider-search" action="/api/search" method="get">
        <label htmlFor="q">Search</label>
        <input id="q" name="text" type="search" />
        <label htmlFor="relax">
          <input id="relax" name="relax" type="checkbox" value="1" />
          {translate(active, "common.retry")}
        </label>
        <button type="submit">{translate(active, "common.confirm")}</button>
      </form>
    </main>
  );
}
