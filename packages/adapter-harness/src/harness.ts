// Adapter capability and certification harness (M036).
// Capabilities are explicit per operation. There is no binary
// integrated=true. Uncertified capabilities are refused at call time.
// FHIR read access never implies booking-write authority.

export type AdapterCapability =
  | "read"
  | "availability"
  | "notifications"
  | "create"
  | "cancel"
  | "reschedule"
  | "atomic-hold"
  | "conflict-enforcement"
  | "reconciliation"
  | "events"
  | "identity-assurance";

export const ALL_CAPABILITIES: readonly AdapterCapability[] = [
  "read", "availability", "notifications", "create", "cancel",
  "reschedule", "atomic-hold", "conflict-enforcement", "reconciliation",
  "events", "identity-assurance",
];

export interface AdapterDeclaration {
  adapterId: string;
  vendor: string;
  /** Capabilities the vendor claims. Never trusted without certification. */
  claimed: AdapterCapability[];
}

export interface CertificationResult {
  adapterId: string;
  capability: AdapterCapability;
  passed: boolean;
  detail: string;
}

export type CapabilityCheck = (
  adapterId: string,
  capability: AdapterCapability,
) => boolean | Promise<boolean>;

export async function certifyAdapter(
  declaration: AdapterDeclaration,
  check: CapabilityCheck,
): Promise<{ certified: AdapterCapability[]; results: CertificationResult[] }> {
  const certified: AdapterCapability[] = [];
  const results: CertificationResult[] = [];
  for (const cap of declaration.claimed) {
    const passed = await check(declaration.adapterId, cap);
    results.push({
      adapterId: declaration.adapterId,
      capability: cap,
      passed,
      detail: passed ? "synthetic-contract-pass" : "synthetic-contract-fail",
    });
    if (passed) certified.push(cap);
  }
  return { certified, results };
}

export interface CertifiedAdapter {
  adapterId: string;
  certified: ReadonlySet<AdapterCapability>;
}

/** Refuse any call requiring an uncertified capability. */
export function requireCapability(
  adapter: CertifiedAdapter,
  capability: AdapterCapability,
): { ok: true } | { ok: false; error: string } {
  if (adapter.certified.has(capability)) return { ok: true };
  return {
    ok: false,
    error: `Adapter ${adapter.adapterId} lacks certified capability ${capability}.`,
  };
}

/** FHIR read certification never grants booking-write authority. */
export function bookingWriteAuthorized(adapter: CertifiedAdapter): boolean {
  return adapter.certified.has("create") && adapter.certified.has("conflict-enforcement");
}

export function capabilityMatrix(
  adapters: readonly CertifiedAdapter[],
): Record<string, AdapterCapability[]> {
  const out: Record<string, AdapterCapability[]> = {};
  for (const a of adapters) out[a.adapterId] = [...a.certified];
  return out;
}
