// Zyara Network N5/C4: audit-chain qualification.
//
// C4 does not invent another audit log. It qualifies whether the important actions that
// already exist across W1 (workforce), W2 (coverage), W3 (tasks), W4 (WhatsApp), C1 (agent
// identities), C2 (derived activity) and C3 (approvals/exceptions) can be *reconstructed*
// reliably from the records those slices own.
//
// The module is a reader and a qualifier, never an authority:
//   * it holds no store and writes nothing, so it cannot change any slice it explains;
//   * a reader returns evidence entries for one correlation id, and this layer refuses an
//     entry that carries another tenant or another correlation id;
//   * it reports, per chain step, whether evidence is present, absent or not applicable for
//     the declared profile, and it reports the gaps it cannot close rather than hiding them;
//   * it computes a *reconstruction fingerprint* over the ordered evidence. That digest is a
//     reproducibility check (the same records always reconstruct to the same fingerprint),
//     and it is explicitly NOT cryptographic tamper-evidence, not a signature, not a Merkle
//     proof and not WORM storage. Append-only here means "no granted update or delete path",
//     nothing more.

export type AuditChainStep =
  | "initiator"
  | "identity"
  | "scope"
  | "authority"
  | "policy_decision"
  | "human_approval"
  | "typed_action"
  | "external_action"
  | "receipt"
  | "canonical_outcome"
  | "derived_activity"
  | "failure_retry";

export const AUDIT_CHAIN_STEPS = [
  "initiator",
  "identity",
  "scope",
  "authority",
  "policy_decision",
  "human_approval",
  "typed_action",
  "external_action",
  "receipt",
  "canonical_outcome",
  "derived_activity",
  "failure_retry",
] as const;

export type AuditChainActorKind = "human" | "agent" | "system" | "external";
export const AUDIT_CHAIN_ACTOR_KINDS = ["human", "agent", "system", "external"] as const;

export type AuditChainSourceDomain =
  | "workforce.tasks"
  | "workforce.coverage"
  | "identity.agents"
  | "communications.whatsapp"
  | "collaboration.approvals"
  | "collaboration.exceptions"
  | "activity.projection";
export const AUDIT_CHAIN_SOURCE_DOMAINS = [
  "workforce.tasks",
  "workforce.coverage",
  "identity.agents",
  "communications.whatsapp",
  "collaboration.approvals",
  "collaboration.exceptions",
  "activity.projection",
] as const;

// A chain profile declares which steps a family of operations must be able to reconstruct.
// A step outside the profile that carries no evidence is "not_applicable" rather than a gap,
// so a task-only chain is not failed for the absence of a provider receipt.
export interface AuditChainProfile {
  requiredSteps: readonly AuditChainStep[];
}

export const AUDIT_CHAIN_PROFILES: Readonly<Record<string, AuditChainProfile>> = {
  // A protected action driven by a human or bounded-agent proposal.
  approval_driven: {
    requiredSteps: [
      "initiator",
      "identity",
      "scope",
      "authority",
      "policy_decision",
      "human_approval",
      "typed_action",
      "canonical_outcome",
      "derived_activity",
    ],
  },
  // An operation that reached an external provider and came back with (or without) a result.
  external_action_driven: {
    requiredSteps: [
      "initiator",
      "identity",
      "scope",
      "typed_action",
      "external_action",
      "receipt",
      "canonical_outcome",
      "derived_activity",
      "failure_retry",
    ],
  },
  // An exception case opened because automation stopped.
  exception_driven: {
    requiredSteps: [
      "initiator",
      "identity",
      "scope",
      "typed_action",
      "canonical_outcome",
      "derived_activity",
    ],
  },
  // An internal operational task with no external action.
  task_only: {
    requiredSteps: ["initiator", "identity", "scope", "typed_action", "derived_activity"],
  },
};

export const AUDIT_CHAIN_PROFILE_NAMES = Object.keys(AUDIT_CHAIN_PROFILES) as readonly string[];

// What the presence of evidence from a source domain implies about the chain. A profile that
// does not require these steps would let a caller under-declare what a chain must answer, so
// the assembly refuses that combination instead of reporting a weak chain as complete.
export const AUDIT_CHAIN_EVIDENCE_REQUIREMENTS: Readonly<
  Record<AuditChainSourceDomain, readonly AuditChainStep[]>
> = {
  "workforce.tasks": ["initiator", "identity", "typed_action"],
  "workforce.coverage": ["initiator", "canonical_outcome"],
  "identity.agents": ["identity", "authority"],
  "communications.whatsapp": ["external_action", "receipt"],
  "collaboration.approvals": [
    "authority",
    "policy_decision",
    "human_approval",
    "typed_action",
    "canonical_outcome",
  ],
  "collaboration.exceptions": ["typed_action", "canonical_outcome", "derived_activity"],
  "activity.projection": ["derived_activity"],
};

// The strictest declared profile that covers the evidence a chain actually contains, used to
// tell a caller which profile its chain requires instead of silently accepting a weaker one.
export function recommendedProfile(entries: readonly AuditChainEntry[]): string {
  const domains = new Set(entries.map((entry) => entry.sourceDomain));
  let recommended = "task_only";
  for (const name of AUDIT_CHAIN_PROFILE_NAMES) {
    const required = AUDIT_CHAIN_PROFILES[name].requiredSteps;
    const covers = [...domains].every((domain) =>
      AUDIT_CHAIN_EVIDENCE_REQUIREMENTS[domain].every((step) => required.includes(step)),
    );
    if (covers && recommended === "task_only" && name !== "task_only") recommended = name;
    if (covers && name === "approval_driven") return name;
  }
  return recommended;
}

// Evidence returned by a reader. `recordRef` names the authoritative record inside the owning
// slice; it is a bounded reference token, never prose and never a payload.
export interface AuditChainEntry {
  step: AuditChainStep;
  sourceDomain: AuditChainSourceDomain;
  recordRef: string;
  occurredAt: string;
  actorKind: AuditChainActorKind;
  actorRef: string | null;
  // A closed code from the owning slice (a status, a result or a reason code), never prose.
  outcomeCode: string | null;
  // The scope of the authoritative record this entry names. The assembly refuses an entry
  // from another tenant, so a chain can never be widened by a careless reader.
  tenantId: string;
  branchId: string | null;
}

export interface AuditChainQuery {
  tenantId: string;
  branchId: string | null;
  correlationId: string;
  profile: string;
  asOf: string;
}

export interface AuditChainStepReport {
  step: AuditChainStep;
  status: "present" | "absent" | "not_applicable";
  evidence: readonly AuditChainEntry[];
}

// Gaps that C4 found in the earlier slices. They are data, not comments, so they can be
// listed, tested and handed to a later slice with an owner.
export interface AuditChainGap {
  code: string;
  surface: string;
  description: string;
  status: "closed_by_c4" | "open";
  mitigation: string;
  nextTask: string;
}

export const AUDIT_CHAIN_GAP_REGISTER: readonly AuditChainGap[] = [
  {
    code: "COVERAGE_EXCEPTION_WITHOUT_CORRELATION",
    surface: "W2 coverage exceptions",
    description:
      "A coverage exception carried no correlation id, so it could not be joined to the chain that produced it.",
    status: "closed_by_c4",
    mitigation:
      "C4 added an optional tenant-scoped correlation reference to the coverage exception (domain, API and table) and refuses a credential-shaped or direct-identifier value.",
    nextTask: "none",
  },
  {
    code: "INBOUND_PROVIDER_EVENT_WITHOUT_CORRELATION",
    surface: "W4 WhatsApp webhook receipts",
    description:
      "A verified inbound provider event had no Zyara correlation reference, so an inbound-triggered chain had no join key.",
    status: "closed_by_c4",
    mitigation:
      "C4 mints a deterministic tenant-scoped receipt correlation reference at the boundary, derived from the tenant, account and provider event key, so the receipt is joinable without inventing provider semantics.",
    nextTask: "none",
  },
  {
    code: "WORKFORCE_RECORDS_WITHOUT_CORRELATION",
    surface: "W1 staff assignments, shifts, leave requests",
    description:
      "W1 administrative records carry no correlation id. They describe workforce state rather than an operation, so they are the beginning of a chain rather than a step in one.",
    status: "open",
    mitigation:
      "Chains that reference a W1 record identify it by its bounded record reference; a dedicated W1 correlation field is deferred rather than half-added.",
    nextTask: "a later workforce slice, if workforce state ever initiates an approved operation",
  },
  {
    code: "NO_DURABLE_OUTBOX_IN_THIS_BUILD",
    surface: "all slices",
    description:
      "W1-W4 and C1-C3 use in-process stores in this build, so a chain is reconstructable only for records that survived in the process or in the database tables.",
    status: "open",
    mitigation:
      "The database contract, row-level security and append-only grants are proven against real PostgreSQL; a durable outbox and consumer are not implemented.",
    nextTask: "the durable-events/platform slice",
  },
  {
    code: "NO_CRYPTOGRAPHIC_TAMPER_EVIDENCE",
    surface: "all append-only trails",
    description:
      "Append-only means the application role holds no update or delete path. There is no hash chain, signature, Merkle structure or WORM storage.",
    status: "open",
    mitigation:
      "C4 provides a reconstruction fingerprint for reproducibility and states plainly that it does not prove tamper-evidence.",
    nextTask: "a dedicated tamper-evidence decision (signing or WORM) if a compliance requirement demands it",
  },
  {
    code: "NO_VERIFIED_AGENT_CREDENTIAL_PATH",
    surface: "C1/C3 agent actors",
    description:
      "There is still no service token, mTLS, SPIFFE/SPIRE or workload identity, so an agent-originated HTTP write is not enabled.",
    status: "open",
    mitigation:
      "Agent attribution is exercised through the trusted server-side call path and recorded explicitly.",
    nextTask: "the identity/workload slice",
  },
  {
    code: "APPROVAL_METADATA_OPERATIONAL_VISIBILITY",
    surface: "C3 approvals/exceptions projected into C2 activity",
    description:
      "Approval and exception activity rows are operational metadata, so a critical-risk protected action is visible to branch operations readers; restricted sensitivity is reserved for clinical content.",
    status: "open",
    mitigation:
      "No parameter value, prose or receipt reference is projected; a compliance-sensitivity class is required before a stricter gate can exist.",
    nextTask: "a compliance-sensitivity slice",
  },
];

export const AUDIT_CHAIN_GAP_CODES = AUDIT_CHAIN_GAP_REGISTER.map((gap) => gap.code);

export interface AuditChainReport {
  correlationId: string;
  tenantId: string;
  branchId: string | null;
  profile: string;
  asOf: string;
  steps: readonly AuditChainStepReport[];
  entries: readonly AuditChainEntry[];
  // Required steps that carry no evidence.
  missingSteps: readonly AuditChainStep[];
  gaps: readonly string[];
  // A reproducibility digest over the ordered evidence, not tamper-evidence.
  fingerprint: string;
  reconstructable: boolean;
}

export type AuditChainErrorCode =
  | "AUDIT_CHAIN_CROSS_TENANT"
  | "AUDIT_CHAIN_CROSS_BRANCH"
  | "AUDIT_CHAIN_CORRELATION_MISMATCH"
  | "AUDIT_CHAIN_UNKNOWN_PROFILE"
  | "AUDIT_CHAIN_PROFILE_UNDER_SPECIFIED"
  | "AUDIT_CHAIN_UNKNOWN_STEP"
  | "AUDIT_CHAIN_UNKNOWN_SOURCE_DOMAIN"
  | "AUDIT_CHAIN_UNKNOWN_ACTOR_KIND"
  | "AUDIT_CHAIN_MALFORMED";

export class AuditChainError extends Error {
  code: AuditChainErrorCode;

  constructor(code: AuditChainErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const REFERENCE_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;
const DIRECT_IDENTIFIER_PATTERNS = [/^[0-9]{7,}$/, /[0-9]{9,}/];
const SECRET_PATTERNS = [
  /secret:\/\//i,
  /bearer\s/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /app[_-]?secret/i,
  /verify[_-]?token/i,
  /private[_-]?key/i,
  /password/i,
  /passwd/i,
  /credential/i,
  /authorization/i,
  /eaag/i,
];

export function isAuditChainReference(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  if (!REFERENCE_PATTERN.test(value)) return false;
  if (DIRECT_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(value))) return false;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) return false;
  return true;
}

// A correlation id is often a minted digest, and a hex digest may legitimately contain a long
// run of digits, so it is validated by shape and secret refusal only. The direct-identifier
// rule still applies to every stored reference that names a record, an actor or an outcome.
export function isAuditChainCorrelationId(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  if (!REFERENCE_PATTERN.test(value)) return false;
  if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) return false;
  return true;
}

function isOneOf<T extends string>(allowed: readonly T[], value: string): value is T {
  return (allowed as readonly string[]).includes(value);
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function assertEntry(entry: AuditChainEntry, query: AuditChainQuery, index: number): void {
  const label = `evidence entry ${index}`;
  if (!isOneOf(AUDIT_CHAIN_STEPS, entry.step)) {
    throw new AuditChainError("AUDIT_CHAIN_UNKNOWN_STEP", `${label} has an unknown step`);
  }
  if (!isOneOf(AUDIT_CHAIN_SOURCE_DOMAINS, entry.sourceDomain)) {
    throw new AuditChainError(
      "AUDIT_CHAIN_UNKNOWN_SOURCE_DOMAIN",
      `${label} names an unregistered source domain`,
    );
  }
  if (!isOneOf(AUDIT_CHAIN_ACTOR_KINDS, entry.actorKind)) {
    throw new AuditChainError(
      "AUDIT_CHAIN_UNKNOWN_ACTOR_KIND",
      `${label} names an unregistered actor kind`,
    );
  }
  if (!isAuditChainReference(entry.recordRef)) {
    throw new AuditChainError(
      "AUDIT_CHAIN_MALFORMED",
      `${label} must carry a bounded record reference, never prose or a credential`,
    );
  }
  if (entry.actorRef !== null && !isAuditChainReference(entry.actorRef)) {
    throw new AuditChainError(
      "AUDIT_CHAIN_MALFORMED",
      `${label} must carry a bounded actor reference`,
    );
  }
  if (entry.outcomeCode !== null && !isAuditChainReference(entry.outcomeCode)) {
    throw new AuditChainError(
      "AUDIT_CHAIN_MALFORMED",
      `${label} must carry a closed outcome or reason code`,
    );
  }
  if (Number.isNaN(Date.parse(entry.occurredAt))) {
    throw new AuditChainError("AUDIT_CHAIN_MALFORMED", `${label} has an unparseable timestamp`);
  }
  if (entry.tenantId !== query.tenantId) {
    throw new AuditChainError(
      "AUDIT_CHAIN_CROSS_TENANT",
      `${label} belongs to another tenant`,
    );
  }
  if (!isAuditChainReference(entry.tenantId)) {
    throw new AuditChainError("AUDIT_CHAIN_MALFORMED", `${label} must name its tenant`);
  }
  if (entry.branchId !== null && !isAuditChainReference(entry.branchId)) {
    throw new AuditChainError("AUDIT_CHAIN_MALFORMED", `${label} must name a bounded branch`);
  }
  if (query.branchId !== null && entry.branchId !== null && entry.branchId !== query.branchId) {
    throw new AuditChainError(
      "AUDIT_CHAIN_CROSS_BRANCH",
      `${label} belongs to another branch`,
    );
  }
}

// The reader contract. Entries returned for a query must belong to the query's tenant and
// correlation id; the assembly refuses anything else instead of quietly widening the chain.
export interface AuditChainReaderInput {
  tenantId: string;
  branchId: string | null;
  correlationId: string;
  asOf: string;
}

export interface AuditChainReaderEntry extends AuditChainEntry {
  correlationId: string;
}

// Supplied by the caller from the owning slices. C4 never invents evidence; a slice that
// cannot answer returns nothing and the step is reported as absent.
export interface AuditChainReader {
  readonly sourceDomain: AuditChainSourceDomain;
  read(input: AuditChainReaderInput): AuditChainReaderEntry[];
}

export async function assembleAuditChain(
  query: AuditChainQuery,
  readers: readonly AuditChainReader[],
): Promise<AuditChainReport> {
  if (!isAuditChainCorrelationId(query.correlationId)) {
    throw new AuditChainError(
      "AUDIT_CHAIN_MALFORMED",
      "correlation id must be a bounded reference token",
    );
  }
  if (!isAuditChainReference(query.tenantId)) {
    throw new AuditChainError("AUDIT_CHAIN_MALFORMED", "tenant id must be a bounded reference token");
  }
  if (Number.isNaN(Date.parse(query.asOf))) {
    throw new AuditChainError("AUDIT_CHAIN_MALFORMED", "asOf must be a timestamp");
  }
  const profile = AUDIT_CHAIN_PROFILES[query.profile];
  if (!profile) {
    throw new AuditChainError(
      "AUDIT_CHAIN_UNKNOWN_PROFILE",
      `unknown chain profile: ${query.profile}`,
    );
  }
  const entries: AuditChainEntry[] = [];
  for (const reader of readers) {
    const returned = reader.read({
      tenantId: query.tenantId,
      branchId: query.branchId,
      correlationId: query.correlationId,
      asOf: query.asOf,
    });
    for (const entry of returned) {
      if (entry.correlationId !== query.correlationId) {
        throw new AuditChainError(
          "AUDIT_CHAIN_CORRELATION_MISMATCH",
          `${reader.sourceDomain} returned evidence for another correlation id`,
        );
      }
      if (entry.sourceDomain !== reader.sourceDomain) {
        throw new AuditChainError(
          "AUDIT_CHAIN_CORRELATION_MISMATCH",
          `${reader.sourceDomain} returned evidence attributed to ${entry.sourceDomain}`,
        );
      }
      assertEntry(entry, query, entries.length);
      entries.push(entry);
    }
  }
  // Deterministic order: chain step order first, then time, then the owning record.
  const stepOrder = new Map(AUDIT_CHAIN_STEPS.map((step, index) => [step, index]));
  const ordered = [...entries].sort((left, right) => {
    const stepDelta = (stepOrder.get(left.step) ?? 0) - (stepOrder.get(right.step) ?? 0);
    if (stepDelta !== 0) return stepDelta;
    const timeDelta = left.occurredAt.localeCompare(right.occurredAt);
    if (timeDelta !== 0) return timeDelta;
    return `${left.sourceDomain}:${left.recordRef}`.localeCompare(
      `${right.sourceDomain}:${right.recordRef}`,
    );
  });
  // A profile must not under-declare what the evidence requires: a caller cannot ask for a
  // weaker chain than the records prove it was.
  const implicated = new Set<AuditChainStep>();
  for (const entry of ordered) {
    for (const step of AUDIT_CHAIN_EVIDENCE_REQUIREMENTS[entry.sourceDomain]) {
      implicated.add(step);
    }
  }
  const underSpecified = [...implicated].filter((step) => !profile.requiredSteps.includes(step));
  if (underSpecified.length > 0) {
    throw new AuditChainError(
      "AUDIT_CHAIN_PROFILE_UNDER_SPECIFIED",
      `profile ${query.profile} does not require ${underSpecified.join(", ")}; ` +
        `the evidence implies profile ${recommendedProfile(ordered)}`,
    );
  }
  const steps: AuditChainStepReport[] = AUDIT_CHAIN_STEPS.map((step) => {
    const evidence = ordered.filter((entry) => entry.step === step);
    if (evidence.length > 0) return { step, status: "present", evidence };
    // Every evidence entry declares the scope of the record it names, so a chain that has any
    // evidence at all can answer "under which tenant and branch".
    if (step === "scope" && ordered.length > 0) {
      return { step, status: "present", evidence: [ordered[0]] };
    }
    return {
      step,
      status: profile.requiredSteps.includes(step) ? "absent" : "not_applicable",
      evidence: [],
    };
  });
  const missingSteps = steps
    .filter((report) => report.status === "absent")
    .map((report) => report.step);
  const fingerprint = await chainFingerprint(query, ordered);
  return {
    correlationId: query.correlationId,
    tenantId: query.tenantId,
    branchId: query.branchId,
    profile: query.profile,
    asOf: query.asOf,
    steps,
    entries: ordered,
    missingSteps,
    gaps: AUDIT_CHAIN_GAP_CODES,
    fingerprint,
    reconstructable: missingSteps.length === 0,
  };
}

// Reproducibility digest: the same ordered evidence and query always produce the same value,
// so a later divergence is visible. It is NOT a signature, a hash chain over storage, a
// Merkle proof or WORM evidence, and no tamper-evidence claim is made.
export async function chainFingerprint(
  query: Pick<AuditChainQuery, "tenantId" | "branchId" | "correlationId" | "profile">,
  entries: readonly AuditChainEntry[],
): Promise<string> {
  const canonical = entries
    .map((entry) =>
      [
        entry.step,
        entry.sourceDomain,
        entry.recordRef,
        entry.occurredAt,
        entry.actorKind,
        entry.actorRef ?? "-",
        entry.outcomeCode ?? "-",
      ].join("\u001f"),
    )
    .join("\u001e");
  const digest = await sha256Hex(
    [query.tenantId, query.branchId ?? "-", query.correlationId, query.profile, canonical].join(
      "\u0000",
    ),
  );
  return `chain_${digest}`;
}

// A coverage summary an operator or an evidence packet can read: which slices answered, how
// many steps were reconstructed and which gaps stay open.
export function summariseAuditChain(report: AuditChainReport): {
  reconstructable: boolean;
  presentSteps: number;
  absentSteps: readonly AuditChainStep[];
  sourceDomains: readonly string[];
  openGaps: number;
} {
  return {
    reconstructable: report.reconstructable,
    presentSteps: report.steps.filter((step) => step.status === "present").length,
    absentSteps: report.missingSteps,
    sourceDomains: [...new Set(report.entries.map((entry) => entry.sourceDomain))].sort(),
    openGaps: AUDIT_CHAIN_GAP_REGISTER.filter((gap) => gap.status === "open").length,
  };
}
