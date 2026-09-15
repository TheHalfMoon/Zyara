// Service and practice onboarding configuration (M009).
// Completeness scores are advisory; mandatory blockers gate publish.
// Insurance acceptance is dated per branch/network/service. Intake fields are
// restricted: national IDs and free clinical text are rejected at config time.

export type ConfigRole = "org_admin" | "branch_admin" | "receptionist";
export type AppointmentKind = "initial" | "follow_up";

export interface AppointmentTypeConfig {
  id: string;
  kind: AppointmentKind;
  durationMin: number | null;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  resourceId: string | null;
  intakeVersion: string | null;
  policyVersion: string | null;
}

export interface InsuranceConfig {
  insurer: string;
  network: string;
  serviceId: string;
  branchId: string;
  from: string;
  to: string | null;
}

export interface ServiceConfig {
  serviceId: string;
  branchId: string;
  labels: Record<string, string>;
  contact: { phone: string | null; address: string | null };
  accessibility: { wheelchair: boolean | null; notes: Record<string, string> };
  appointmentTypes: AppointmentTypeConfig[];
  insurance: InsuranceConfig[];
  intakeFields: string[];
  integrationOwner: string | null;
  // Authority: checked M008 claim state for this branch.
  authorityState: "checked" | "pending" | "expired" | "withdrawn" | "disputed" | null;
  coordinates: { lat: number | null; lng: number | null };
}

export type BlockerCode =
  | "BLOCK_DURATION"
  | "BLOCK_RESOURCE"
  | "BLOCK_AUTHORITY"
  | "BLOCK_INTAKE_VERSION"
  | "BLOCK_POLICY_VERSION"
  | "BLOCK_INTAKE_FIELD";

export interface PublishDecision {
  publishable: boolean;
  blockers: BlockerCode[];
  // Advisory only: never gates publish by itself.
  completeness: number;
}

// Restricted intake allowlist. National IDs, free-text clinical notes and
// insurer card images are rejected: collect only material booking fields.
const ALLOWED_INTAKE_FIELDS = new Set([
  "contact_phone",
  "contact_email",
  "preferred_language",
  "accessibility_needs",
  "referral_code",
  "insurance_member_id",
  "visit_reason_code",
]);

const CONFIGURE_ROLES: ConfigRole[] = ["org_admin", "branch_admin", "receptionist"];

export function canConfigure(role: string): boolean {
  return (CONFIGURE_ROLES as string[]).includes(role);
}

export function validateForPublish(config: ServiceConfig): PublishDecision {
  const blockers = new Set<BlockerCode>();
  for (const t of config.appointmentTypes) {
    if (!t.durationMin || t.durationMin <= 0) blockers.add("BLOCK_DURATION");
    if (!t.resourceId) blockers.add("BLOCK_RESOURCE");
    if (!t.intakeVersion) blockers.add("BLOCK_INTAKE_VERSION");
    if (!t.policyVersion) blockers.add("BLOCK_POLICY_VERSION");
  }
  if (config.appointmentTypes.length === 0) {
    blockers.add("BLOCK_DURATION");
    blockers.add("BLOCK_RESOURCE");
  }
  if (config.authorityState !== "checked") blockers.add("BLOCK_AUTHORITY");
  for (const f of config.intakeFields) {
    if (!ALLOWED_INTAKE_FIELDS.has(f)) blockers.add("BLOCK_INTAKE_FIELD");
  }
  // Completeness: advisory fraction of optional slots filled.
  const slots: boolean[] = [
    Object.keys(config.labels).length >= 2,
    config.contact.phone !== null,
    config.contact.address !== null,
    config.accessibility.wheelchair !== null,
    config.integrationOwner !== null,
    config.coordinates.lat !== null && config.coordinates.lng !== null,
    config.insurance.length > 0,
  ];
  const completeness = slots.filter(Boolean).length / slots.length;
  return { publishable: blockers.size === 0, blockers: [...blockers], completeness };
}

export function insuranceActiveAt(policy: InsuranceConfig, atIso: string): boolean {
  return policy.from <= atIso && (policy.to === null || atIso <= policy.to);
}

export function draftConfig(serviceId: string, branchId: string): ServiceConfig {
  // Partial save/resume: drafts are valid objects with blockers, never published.
  return {
    serviceId,
    branchId,
    labels: {},
    contact: { phone: null, address: null },
    accessibility: { wheelchair: null, notes: {} },
    appointmentTypes: [],
    insurance: [],
    intakeFields: [],
    integrationOwner: null,
    authorityState: null,
    coordinates: { lat: null, lng: null },
  };
}
