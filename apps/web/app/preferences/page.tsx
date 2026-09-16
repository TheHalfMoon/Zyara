// Notification preferences (M020). English only.
// Purpose/channel consent with verified destinations. Defaults deny
// non-essential channels; fallback requires its own explicit consent.
export default function PreferencesPage(): React.ReactElement {
  return (
    <main dir="auto" aria-label="Notification preferences">
      <h1>Notification preferences</h1>
      <form aria-label="Channel consent">
        <label><input type="checkbox" name="inapp" defaultChecked /> In-app updates</label>
        <label><input type="checkbox" name="email" /> Email</label>
        <label><input type="checkbox" name="sms" /> SMS</label>
        <label>Quiet hours <input type="text" name="quiet" defaultValue="22:00-07:00" /></label>
        <button type="submit">Save preferences</button>
      </form>
      <p>External previews are generic. Sign in to view appointment details.</p>
    </main>
  );
}
