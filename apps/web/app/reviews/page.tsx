// Verified experience reviews (M022). English only.
// Anonymous public projection: dimensions plus redacted text. Internal
// patient identity is never rendered. Unsafe text is quarantined.
export default function ReviewsPage(): React.ReactElement {
  return (
    <main dir="auto" aria-label="Patient reviews">
      <h1>Patient reviews</h1>
      <p>Verified visits only. Reviews are anonymous; providers may reply without exposing care facts.</p>
      <ul aria-label="Published reviews"><li>No public reviews in this synthetic preview.</li></ul>
    </main>
  );
}
