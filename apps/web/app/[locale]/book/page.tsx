// M017 minimal-identity booking page. English only.
// Anonymous availability first; contact verification only at action time;
// exact confirmation dialog before consequential action; honest mode outcomes.
"use client";

import { useState } from "react";

type Mode = "instant" | "request" | "call" | "redirect";

const HONEST: Record<Mode, string> = {
  instant: "Instant booking confirms only after a committed appointment exists. Until then: not booked yet.",
  request: "Request pending. A request is not an appointment and holds no availability.",
  call: "Call the clinic to book. Zyara did not make an appointment.",
  redirect: "You are leaving Zyara. Returning does not prove success.",
};

export default function BookPage() {
  const [mode, setMode] = useState<Mode>("instant");
  const [confirmed, setConfirmed] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  function submit() {
    if (!confirmed) {
      setOutcome("Confirmation required: review patient, acting person, provider, time, and mode, then confirm.");
      return;
    }
    setOutcome(HONEST[mode]);
  }

  return (
    <main aria-labelledby="book-title">
      <h1 id="book-title">Book care</h1>
      <p>Browse availability with no account. Verify contact only when booking.</p>
      <fieldset>
        <legend>Booking mode</legend>
        {(Object.keys(HONEST) as Mode[]).map((m) => (
          <label key={m}>
            <input
              type="radio"
              name="mode"
              value={m}
              checked={mode === m}
              onChange={() => setMode(m)}
            />
            {m}
          </label>
        ))}
      </fieldset>
      <label>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I confirm the exact booking facts shown above (never preselected)
      </label>
      <div>
        <button type="button" onClick={submit}>
          Continue
        </button>
      </div>
      <section aria-live="polite" role="status">
        {outcome}
      </section>
    </main>
  );
}
