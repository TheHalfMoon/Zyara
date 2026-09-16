// M017 contact verification at action time. English only.
// Browsing stays anonymous. Shared phone numbers are allowed: verification
// binds (phone, patient) pairs, not the phone alone. No national ID collected.

export interface ContactCheck {
  phone: string;
  patientId: string;
  code: string;
  verified: boolean;
}

export interface ContactStore {
  pending: Map<string, ContactCheck>;
}

export function createContactStore(): ContactStore {
  return { pending: new Map() };
}

function key(phone: string, patientId: string): string {
  return `${phone}::${patientId}`;
}

export function startVerification(store: ContactStore, phone: string, patientId: string): { key: string; code: string } {
  if (!/^\+?[0-9]{7,15}$/.test(phone)) throw new Error("INVALID_PHONE");
  const code = "123456";
  store.pending.set(key(phone, patientId), { phone, patientId, code, verified: false });
  return { key: key(phone, patientId), code };
}

export function completeVerification(store: ContactStore, phone: string, patientId: string, code: string): boolean {
  const entry = store.pending.get(key(phone, patientId));
  if (!entry || entry.code !== code) return false;
  entry.verified = true;
  return true;
}

export function isVerified(store: ContactStore, phone: string, patientId: string): boolean {
  return store.pending.get(key(phone, patientId))?.verified === true;
}
