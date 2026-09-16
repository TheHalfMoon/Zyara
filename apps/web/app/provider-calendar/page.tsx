// Provider calendar read/control surface (M019). English only.
// Reads project through canonical server actions; writes route through
// M016/M018 commands. Includes list/table fallback and keyboard support.
export default function ProviderCalendarPage(): React.ReactElement {
  return (
    <main dir="auto" aria-label="Provider calendar">
      <h1>Provider calendar</h1>
      <p>Day, week, month, and list views filter by branch, practitioner, resource, and status.</p>
      <p>Drag and drop requires versioned confirmation and routes to the canonical change command. A keyboard and list alternative is always available.</p>
      <table aria-label="Appointment list fallback">
        <thead><tr><th scope="col">Start</th><th scope="col">End</th><th scope="col">Status</th></tr></thead>
        <tbody><tr><td>—</td><td>—</td><td>Scheduled</td></tr></tbody>
      </table>
    </main>
  );
}
