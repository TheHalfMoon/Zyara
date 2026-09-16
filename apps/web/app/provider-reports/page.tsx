// Provider monthly reports (M025). English only.
// Scoped to the provider tenant. Commercial state never influences rank
// or reviews. Existing patient appointment access is independent of billing.
export default function ProviderReportsPage(): React.ReactElement {
  return (
    <main dir="auto" aria-label="Provider monthly report">
      <h1>Monthly report</h1>
      <p>Coverage, backlog, conversion, attendance, and capacity with three operational recommendations.</p>
      <table aria-label="Report totals">
        <thead><tr><th scope="col">Metric</th><th scope="col">Value</th></tr></thead>
        <tbody><tr><td>Bookings committed</td><td>—</td></tr></tbody>
      </table>
    </main>
  );
}
