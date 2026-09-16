// M018 safe change page. English only.
// Preview links never mutate: this page explains the requested change and
// requires an explicit POST-backed confirmation. Failed replacement keeps
// the original appointment.
"use client";

import { useState } from "react";

export default function ChangePage() {
  const [confirmed, setConfirmed] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  function act(kind: "cancel" | "reschedule") {
    if (!confirmed) {
      setOutcome("Confirmation required before any change is applied.");
      return;
    }
    setOutcome(
      kind === "cancel"
        ? "Cancellation requested. It applies only after the server commits it."
        : "Replacement requested. Your original appointment stays until the new time commits.",
    );
  }

  return (
    <main aria-labelledby="change-title">
      <h1 id="change-title">Change or cancel</h1>
      <p>
        Opening this link changes nothing. After the free change window,
        contact assistance. A moved appointment counts as a move, not a
        missed visit.
      </p>
      <label>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I confirm this change against the exact appointment shown (never preselected)
      </label>
      <div>
        <button type="button" onClick={() => act("reschedule")}>
          Move appointment
        </button>
        <button type="button" onClick={() => act("cancel")}>
          Cancel appointment
        </button>
      </div>
      <section aria-live="polite" role="status">
        {outcome}
      </section>
    </main>
  );
}
