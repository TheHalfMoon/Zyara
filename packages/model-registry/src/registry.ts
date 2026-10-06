// Zyara AI Operating Fabric AIF-03A: the model and prompt registry.
//
// Authority: AIF plan §12 (AIF-03A) and §12A.1, §12A.2, §12A.5, §12A.6; AIF handoff §8;
// docs/evidence/AIF/AIF-03A/WORK_PACKET.md.
//
// Provider-neutral registry of exact model identities, immutable prompt versions, separated
// agent classes and kill switches. Nothing here calls a model or provider: selection, binding
// and every disable decision read only registry state, so an emergency disable works while the
// affected provider is down. No model is admitted globally, a fallback never widens residency,
// runtime or data use, and a historical invocation binding can never change.

import { CAPABILITY_DATA_CLASSES, type CapabilityDataClass } from "@zyara/capability-gateway";

export const AGENT_CLASSES = ["PATIENT_NAVIGATION", "CLINIC_OPERATIONS", "CLINICIAN_ASSIST", "ANALYTICS_RESEARCH", "INTEGRATION_BROWSER"] as const;
export type AgentClass = (typeof AGENT_CLASSES)[number];

// Ordered from most to least restricted.
export const DEPLOYMENT_LOCATIONS = ["TENANT_DEVICE", "ZYARA_KSA", "PROVIDER_KSA", "PROVIDER_GCC", "PROVIDER_OTHER"] as const;
export type DeploymentLocation = (typeof DEPLOYMENT_LOCATIONS)[number];

export const ADMISSION_STATES = ["CANDIDATE", "SHADOW", "ADMITTED", "SUSPENDED", "REVOKED"] as const;
export type AdmissionState = (typeof ADMISSION_STATES)[number];

export const ROLLOUT_STATES = ["DRAFT", "CANARY", "ACTIVE", "RETIRED", "REVOKED"] as const;
export type RolloutState = (typeof ROLLOUT_STATES)[number];

export type HealthState = "HEALTHY" | "DEGRADED" | "DOWN";
export type Residency = "KSA_ONLY" | "GCC" | "ANY";

export const HEALTH_MAX_AGE_MS = 5 * 60_000;
export const HEALTH_CLOCK_SKEW_MS = 30_000;

const RESIDENCY_LOCATIONS: Record<Residency, readonly DeploymentLocation[]> = {
  KSA_ONLY: ["TENANT_DEVICE", "ZYARA_KSA", "PROVIDER_KSA"],
  GCC: ["TENANT_DEVICE", "ZYARA_KSA", "PROVIDER_KSA", "PROVIDER_GCC"],
  ANY: DEPLOYMENT_LOCATIONS,
};

// Floating aliases that cannot be a production identity on their own.
const FLOATING_WORDS = new Set([
  "latest", "stable", "default", "preview", "current", "beta", "alpha", "newest", "auto", "main", "master",
  "head", "nightly", "next", "edge", "canary", "dev", "trunk", "tip",
]);
// A pinned revision carries a date (YYYYMMDD or YYYY-MM-DD), a semantic version, or a digest
// (sha256- prefix or a hex run of 12+). A provider alias with a number in it (gpt-4o,
// model-3-5) is not a pin. A floating alias in any word (split on - _ . : / @ +) is refused too.
const PIN = /((19|20)\d{2}-?(0[1-9]|1[0-2])-?(0[1-9]|[12]\d|3[01]))|(\d+\.\d+\.\d+)|(sha256[-:_]?[0-9a-f]{7,})|([0-9a-f]{12,})/i;
function isFloatingRevision(revision: string): boolean {
  return !PIN.test(revision) || revision.split(/[-_.:/@+]/).some((word) => FLOATING_WORDS.has(word.toLowerCase()));
}
const ID = /^[a-z][a-z0-9_.-]{1,63}$/;
const VERSION = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
const REVISION = /^[A-Za-z0-9][A-Za-z0-9._:@+-]{3,127}$/;
const DIGEST = /^evb_[0-9a-f]{64}$/;
const CAPABILITY = /^[a-z][a-z0-9_]{0,39}(\.[a-z][a-z0-9_]{0,39}){1,5}$/;
const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
// Capability ids a clinician-assist agent may never hold: signing, prescribing, ordering or
// finalizing clinical truth.
// A clinician-assist agent may prepare clinical material but never sign, prescribe, order or
// finalize: its capabilities must end in one of these preparatory verbs (an allowlist, so a new
// authority verb such as cosign or esign is refused by default).
const CLINICIAN_ASSIST_VERBS = new Set(["read", "draft", "summarize", "suggest", "prepare", "propose", "explain", "search", "list", "view", "translate"]);

// Agent classes that may never share a capability (plan §12A.5).
const SEPARATED_CLASSES: Partial<Record<AgentClass, AgentClass>> = {
  PATIENT_NAVIGATION: "CLINIC_OPERATIONS",
  CLINIC_OPERATIONS: "PATIENT_NAVIGATION",
};

export interface VersionRef {
  id: string;
  version: string;
}

export interface ModelProfile {
  id: string;
  version: string;
  provider: string;
  modelId: string;
  modelRevision: string;
  runtimeClass: "LOCAL" | "REMOTE";
  deploymentLocation: DeploymentLocation;
  licenseRef: string;
  allowedDataClasses: readonly CapabilityDataClass[];
  allowedTaskClasses: readonly string[];
  allowedAgentClasses: readonly AgentClass[];
  contextLimit: number;
  toolUseAllowed: boolean;
  structuredOutputSchema: VersionRef;
  latencyClass: "INTERACTIVE" | "BATCH";
  evaluationBundleDigest: string;
  egressProviderId: string;
  costPolicyRef: string;
  updateStrategyRef: string;
}

export interface PromptTemplate {
  id: string;
  version: string;
  taskClass: string;
  agentClass: AgentClass;
  outputSchema: VersionRef;
  allowedCapabilities: readonly string[];
  instructions: string;
  locale: string;
  compatibleModels: readonly string[];
  safetyPolicyVersion: string;
  evaluationBundleDigest: string;
  rollbackTarget: string | null;
}

export interface AgentClassProfile {
  agentClass: AgentClass;
  dataCeiling: readonly CapabilityDataClass[];
  capabilities: readonly string[];
  retentionDays: number;
  approvalPolicyRef: string;
  disclosureRef: string;
}

export type Registrar =
  | { kind: "human"; authority: "platform_admin"; id: string }
  | { kind: "system"; principal: "release_pipeline"; id: string };

export type KillSwitchScope = "GLOBAL" | "PROVIDER" | "MODEL" | "CAPABILITY" | "PROMPT";

export interface InvocationBinding {
  profile: VersionRef;
  modelRevision: string;
  profileDigest: string;
  prompt: VersionRef;
  instructionDigest: string;
  safetyPolicyVersion: string;
  outputSchema: VersionRef;
  evaluationBundleDigest: string;
  agentClass: AgentClass;
  bindingDigest: string;
}

export type RegistryErrorCode =
  | "REGISTRY_REGISTRAR_UNTRUSTED"
  | "REGISTRY_INVALID"
  | "REGISTRY_FLOATING_IDENTITY"
  | "REGISTRY_DUPLICATE_VERSION"
  | "REGISTRY_UNKNOWN"
  | "REGISTRY_AGENT_CLASS_OVERLAP"
  | "REGISTRY_CLINICAL_AUTHORITY"
  | "REGISTRY_PROMPT_EXCEEDS_AGENT_CLASS"
  | "REGISTRY_ROLLBACK_INVALID"
  | "REGISTRY_NOT_EXECUTABLE"
  | "REGISTRY_DISABLED"
  | "REGISTRY_INCOMPATIBLE";

export class RegistryError extends Error {
  readonly code: RegistryErrorCode;

  constructor(code: RegistryErrorCode, message: string) {
    super(message);
    this.name = "RegistryError";
    this.code = code;
  }
}

function fail(code: RegistryErrorCode, message: string): never {
  throw new RegistryError(code, message);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(input: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  return [...digest].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function snapshot<T>(value: T): T {
  let text: string | undefined;
  try {
    text = JSON.stringify(value);
  } catch {
    text = undefined;
  }
  if (text === undefined) fail("REGISTRY_INVALID", "input must be plain JSON data");
  return deepFreeze(JSON.parse(text) as T);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}

function trusted(registrar: Registrar): void {
  const r = registrar as unknown as Record<string, unknown>;
  const ok =
    typeof r === "object" &&
    r !== null &&
    typeof r.id === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(r.id) &&
    ((r.kind === "human" && r.authority === "platform_admin") || (r.kind === "system" && r.principal === "release_pipeline"));
  if (!ok) fail("REGISTRY_REGISTRAR_UNTRUSTED", "only a platform admin or the release pipeline may change the registry");
}

function check(condition: boolean, message: string): void {
  if (!condition) fail("REGISTRY_INVALID", message);
}

function versionNumber(version: string): number[] {
  return version.split(".").map(Number);
}

function earlier(a: string, b: string): boolean {
  const [x, y] = [versionNumber(a), versionNumber(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] < y[i];
  return false;
}

function isDataClasses(value: unknown): value is CapabilityDataClass[] {
  return Array.isArray(value) && value.every((item) => (CAPABILITY_DATA_CLASSES as readonly unknown[]).includes(item)) && !value.includes("CREDENTIAL");
}

function validateProfile(p: ModelProfile): void {
  check(ID.test(p.id) && VERSION.test(p.version), "profile id and version");
  check(ID.test(p.provider) && typeof p.modelId === "string" && p.modelId.length > 0 && p.modelId.length <= 128, "provider and model id");
  if (typeof p.modelRevision !== "string" || !REVISION.test(p.modelRevision) || isFloatingRevision(p.modelRevision)) {
    fail("REGISTRY_FLOATING_IDENTITY", "an exact model revision or weights digest is required; floating aliases are not an identity");
  }
  check(p.runtimeClass === "LOCAL" || p.runtimeClass === "REMOTE", "runtime class");
  check((DEPLOYMENT_LOCATIONS as readonly unknown[]).includes(p.deploymentLocation), "deployment location");
  check((p.runtimeClass === "LOCAL") === (p.deploymentLocation === "TENANT_DEVICE" || p.deploymentLocation === "ZYARA_KSA"), "a local runtime is deployed on a tenant device or Zyara infrastructure");
  check(typeof p.licenseRef === "string" && p.licenseRef.length > 0, "license or terms reference");
  check(isDataClasses(p.allowedDataClasses) && p.allowedDataClasses.length > 0, "allowed data classes (CREDENTIAL is never allowed)");
  check(Array.isArray(p.allowedTaskClasses) && p.allowedTaskClasses.length > 0 && p.allowedTaskClasses.every((t) => ID.test(t)), "allowed task classes");
  check(Array.isArray(p.allowedAgentClasses) && p.allowedAgentClasses.length > 0 && p.allowedAgentClasses.every((a) => (AGENT_CLASSES as readonly unknown[]).includes(a)), "allowed agent classes");
  check(Number.isInteger(p.contextLimit) && p.contextLimit > 0, "context limit");
  check(typeof p.toolUseAllowed === "boolean", "tool use flag");
  check(ID.test(p.structuredOutputSchema?.id ?? "") && VERSION.test(p.structuredOutputSchema?.version ?? ""), "structured output schema");
  check(p.latencyClass === "INTERACTIVE" || p.latencyClass === "BATCH", "latency class");
  check(DIGEST.test(p.evaluationBundleDigest), "evaluation bundle digest");
  check(ID.test(p.egressProviderId), "egress provider id");
  check(ID.test(p.costPolicyRef) && ID.test(p.updateStrategyRef), "cost policy and update strategy references");
}

// ---------------------------------------------------------------------------

const MODEL_TRANSITIONS: Readonly<Record<AdmissionState, readonly AdmissionState[]>> = {
  CANDIDATE: ["SHADOW", "ADMITTED", "REVOKED"],
  SHADOW: ["ADMITTED", "REVOKED"],
  ADMITTED: ["SUSPENDED", "REVOKED"],
  SUSPENDED: ["ADMITTED", "REVOKED"],
  REVOKED: [],
};

// RETIRED -> ACTIVE is a rollback re-activation of an earlier version.
const PROMPT_TRANSITIONS: Readonly<Record<RolloutState, readonly RolloutState[]>> = {
  DRAFT: ["CANARY", "RETIRED", "REVOKED"],
  CANARY: ["ACTIVE", "RETIRED", "REVOKED"],
  ACTIVE: ["RETIRED", "REVOKED"],
  RETIRED: ["ACTIVE", "REVOKED"],
  REVOKED: [],
};

function transition<S extends string>(table: Readonly<Record<S, readonly S[]>>, log: { state: S; at: string }[], next: S, at: string, reason: string): void {
  const last = log[log.length - 1];
  if (!table[last.state].includes(next)) fail("REGISTRY_INVALID", `illegal transition ${last.state} -> ${next}`);
  if (typeof reason !== "string" || reason.trim().length === 0) fail("REGISTRY_INVALID", "a status change needs a reason");
  if (Date.parse(at) < Date.parse(last.at)) fail("REGISTRY_INVALID", "status changes are recorded in time order");
}

interface StatusEntry<S> {
  state: S;
  by: string;
  at: string;
  reason: string;
}

interface HealthEntry {
  state: HealthState;
  observedAt: string;
}

export interface SelectionRequest {
  agentClass: AgentClass;
  taskClass: string;
  dataClasses: readonly CapabilityDataClass[];
  capabilityId: string;
  residency: Residency;
  // LOCAL restricts every candidate, the primary included, to local runtimes.
  runtimeClass?: "LOCAL" | "REMOTE";
  primary: VersionRef;
  fallbacks: readonly VersionRef[];
  now: string;
}

export interface SelectionResult {
  chosen: VersionRef | null;
  usedFallback: boolean;
  refusals: readonly { profile: VersionRef; reason: string }[];
}

export class ModelPromptRegistry {
  readonly #profiles = new Map<string, Readonly<ModelProfile>>();
  readonly #profileDigests = new Map<string, string>();
  readonly #profileStatus = new Map<string, StatusEntry<AdmissionState>[]>();
  readonly #health = new Map<string, HealthEntry>();
  readonly #prompts = new Map<string, Readonly<PromptTemplate & { instructionDigest: string }>>();
  readonly #promptStatus = new Map<string, StatusEntry<RolloutState>[]>();
  readonly #agentClasses = new Map<AgentClass, Readonly<AgentClassProfile>>();
  readonly #killSwitches: { scope: KillSwitchScope; target: string; on: boolean; by: string; at: string; reason: string }[] = [];

  // -- agent classes -------------------------------------------------------

  registerAgentClass(profile: AgentClassProfile, registrar: Registrar): void {
    trusted(registrar);
    const p = snapshot(profile);
    check((AGENT_CLASSES as readonly unknown[]).includes(p.agentClass), "agent class");
    check(isDataClasses(p.dataCeiling), "data ceiling (CREDENTIAL is never allowed)");
    check(Array.isArray(p.capabilities) && p.capabilities.every((c) => CAPABILITY.test(c)), "capabilities");
    check(Number.isInteger(p.retentionDays) && p.retentionDays >= 0 && ID.test(p.approvalPolicyRef) && ID.test(p.disclosureRef), "retention, approval policy and disclosure");
    if (this.#agentClasses.has(p.agentClass)) fail("REGISTRY_DUPLICATE_VERSION", "agent class already registered");
    if (
      p.agentClass === "CLINICIAN_ASSIST" &&
      (p.dataCeiling.includes("CLINICAL_SIGNING_REQUIRED") || p.capabilities.some((c) => !CLINICIAN_ASSIST_VERBS.has(c.split(".").pop() ?? "")))
    ) {
      fail("REGISTRY_CLINICAL_AUTHORITY", "a clinician-assist agent may prepare clinical material but never sign, prescribe, order or finalize");
    }
    // A patient-facing agent and a clinic-operations agent never share a capability.
    const counterpart = SEPARATED_CLASSES[p.agentClass] ?? null;
    const other = counterpart === null ? undefined : this.#agentClasses.get(counterpart);
    if (other && p.capabilities.some((c) => other.capabilities.includes(c))) {
      fail("REGISTRY_AGENT_CLASS_OVERLAP", "patient-navigation and clinic-operations agents cannot share capabilities");
    }
    this.#agentClasses.set(p.agentClass, p);
  }

  // -- model profiles ------------------------------------------------------

  async registerModel(profile: ModelProfile, registrar: Registrar, at: string): Promise<string> {
    trusted(registrar);
    check(ISO_INSTANT.test(at), "registration time");
    const p = snapshot(profile);
    validateProfile(p);
    const key = `${p.id}@${p.version}`;
    if (this.#profiles.has(key)) fail("REGISTRY_DUPLICATE_VERSION", "a model profile version is immutable");
    const digest = `mdl_${await sha256Hex(canonicalJson(p))}`;
    this.#profiles.set(key, p);
    this.#profileDigests.set(key, digest);
    this.#profileStatus.set(key, [{ state: "CANDIDATE", by: registrar.id, at, reason: "registered" }]);
    return digest;
  }

  setModelState(ref: VersionRef, state: AdmissionState, registrar: Registrar, at: string, reason: string): void {
    trusted(registrar);
    const key = `${ref.id}@${ref.version}`;
    const log = this.#profileStatus.get(key);
    if (!log) fail("REGISTRY_UNKNOWN", "unknown model profile");
    check((ADMISSION_STATES as readonly unknown[]).includes(state) && ISO_INSTANT.test(at), "state and time");
    if (log[log.length - 1].state === "REVOKED") fail("REGISTRY_NOT_EXECUTABLE", "a revoked profile stays revoked; register a new version");
    transition(MODEL_TRANSITIONS, log, state, at, reason);
    log.push({ state, by: registrar.id, at, reason });
  }

  reportHealth(ref: VersionRef, state: HealthState, observedAt: string): void {
    const key = `${ref.id}@${ref.version}`;
    if (!this.#profiles.has(key)) fail("REGISTRY_UNKNOWN", "unknown model profile");
    check(["HEALTHY", "DEGRADED", "DOWN"].includes(state) && ISO_INSTANT.test(observedAt), "health report");
    const previous = this.#health.get(key);
    if (previous && Date.parse(previous.observedAt) > Date.parse(observedAt)) return; // an older report never overwrites a newer one
    this.#health.set(key, { state, observedAt });
  }

  modelState(ref: VersionRef): AdmissionState | null {
    const log = this.#profileStatus.get(`${ref.id}@${ref.version}`);
    return log ? log[log.length - 1].state : null;
  }

  #healthAt(key: string, now: number): HealthState {
    const entry = this.#health.get(key);
    if (!entry) return "DOWN";
    const observed = Date.parse(entry.observedAt);
    if (Number.isNaN(observed) || now - observed > HEALTH_MAX_AGE_MS || observed - now > HEALTH_CLOCK_SKEW_MS) return "DOWN";
    return entry.state;
  }

  // -- prompts -------------------------------------------------------------

  async registerPrompt(prompt: PromptTemplate, registrar: Registrar, at: string): Promise<string> {
    trusted(registrar);
    check(ISO_INSTANT.test(at), "registration time");
    const p = snapshot(prompt);
    check(ID.test(p.id) && VERSION.test(p.version) && ID.test(p.taskClass), "prompt id, version and task class");
    check((AGENT_CLASSES as readonly unknown[]).includes(p.agentClass), "agent class");
    check(ID.test(p.outputSchema?.id ?? "") && VERSION.test(p.outputSchema?.version ?? ""), "output schema");
    check(typeof p.instructions === "string" && p.instructions.length > 0 && p.instructions.length <= 32_768, "instructions");
    check(LOCALE.test(p.locale), "locale");
    check(Array.isArray(p.compatibleModels) && p.compatibleModels.length > 0 && p.compatibleModels.every((m) => ID.test(m)), "compatible models");
    check(VERSION.test(p.safetyPolicyVersion) && DIGEST.test(p.evaluationBundleDigest), "safety policy and evaluation bundle");
    check(Array.isArray(p.allowedCapabilities) && p.allowedCapabilities.every((c) => CAPABILITY.test(c)), "allowed capabilities");
    const agentClass = this.#agentClasses.get(p.agentClass);
    if (!agentClass) fail("REGISTRY_UNKNOWN", "register the agent class first");
    if (!p.allowedCapabilities.every((c) => agentClass.capabilities.includes(c))) {
      fail("REGISTRY_PROMPT_EXCEEDS_AGENT_CLASS", "a prompt cannot grant capabilities its agent class does not hold");
    }
    if (p.rollbackTarget !== null) {
      const target = p.rollbackTarget;
      const targetLog = this.#promptStatus.get(`${p.id}@${target}`);
      const everActive = targetLog?.some((entry) => entry.state === "ACTIVE") ?? false;
      const revoked = targetLog?.[targetLog.length - 1].state === "REVOKED";
      if (!VERSION.test(target) || !earlier(target, p.version) || !everActive || revoked) {
        fail("REGISTRY_ROLLBACK_INVALID", "a rollback target is an earlier, once-active, unrevoked version of the same prompt");
      }
    }
    const key = `${p.id}@${p.version}`;
    if (this.#prompts.has(key)) fail("REGISTRY_DUPLICATE_VERSION", "a prompt version is immutable; register a new version");
    const instructionDigest = `ins_${await sha256Hex(p.instructions)}`;
    this.#prompts.set(key, Object.freeze({ ...p, instructionDigest }));
    this.#promptStatus.set(key, [{ state: "DRAFT", by: registrar.id, at, reason: "registered" }]);
    return instructionDigest;
  }

  setPromptState(ref: VersionRef, state: RolloutState, registrar: Registrar, at: string, reason: string): void {
    trusted(registrar);
    const log = this.#promptStatus.get(`${ref.id}@${ref.version}`);
    if (!log) fail("REGISTRY_UNKNOWN", "unknown prompt");
    check((ROLLOUT_STATES as readonly unknown[]).includes(state) && ISO_INSTANT.test(at), "state and time");
    if (log[log.length - 1].state === "REVOKED") fail("REGISTRY_NOT_EXECUTABLE", "a revoked prompt stays revoked; register a new version");
    transition(PROMPT_TRANSITIONS, log, state, at, reason);
    log.push({ state, by: registrar.id, at, reason });
  }

  promptState(ref: VersionRef): RolloutState | null {
    const log = this.#promptStatus.get(`${ref.id}@${ref.version}`);
    return log ? log[log.length - 1].state : null;
  }

  // -- kill switches -------------------------------------------------------

  setKillSwitch(scope: KillSwitchScope, target: string, on: boolean, registrar: Registrar, at: string, reason: string): void {
    trusted(registrar);
    check(["GLOBAL", "PROVIDER", "MODEL", "CAPABILITY", "PROMPT"].includes(scope) && ISO_INSTANT.test(at) && typeof reason === "string" && reason.length > 0, "kill switch");
    const key = scope === "GLOBAL" ? "*" : target;
    if (scope !== "GLOBAL" && !(scope === "CAPABILITY" ? CAPABILITY.test(target) : ID.test(target))) fail("REGISTRY_INVALID", "kill switch target");
    const last = [...this.#killSwitches].reverse().find((entry) => entry.scope === scope && entry.target === key);
    if (last && Date.parse(at) < Date.parse(last.at)) fail("REGISTRY_INVALID", "kill switch changes are recorded in time order");
    this.#killSwitches.push({ scope, target: key, on, by: registrar.id, at, reason });
  }

  // Reads only the kill-switch log; never calls a model or provider.
  isDisabled(target: { provider?: string; model?: string; capability?: string; prompt?: string }): boolean {
    const active = (scope: KillSwitchScope, value: string | undefined): boolean => {
      if (value === undefined && scope !== "GLOBAL") return false;
      const key = scope === "GLOBAL" ? "*" : value;
      let on = false;
      for (const entry of this.#killSwitches) if (entry.scope === scope && entry.target === key) on = entry.on;
      return on;
    };
    return (
      active("GLOBAL", "*") ||
      active("PROVIDER", target.provider) ||
      active("MODEL", target.model) ||
      active("CAPABILITY", target.capability) ||
      active("PROMPT", target.prompt)
    );
  }

  // -- selection -----------------------------------------------------------

  selectModel(input: SelectionRequest): SelectionResult {
    const request = snapshot(input);
    const now = Date.parse(request.now);
    const refusals: { profile: VersionRef; reason: string }[] = [];
    const agentClass = this.#agentClasses.get(request.agentClass);
    const primary = this.#profiles.get(`${request.primary.id}@${request.primary.version}`);
    const candidates = [request.primary, ...request.fallbacks];
    if (!agentClass || !primary || Number.isNaN(now) || !ISO_INSTANT.test(request.now)) {
      return { chosen: null, usedFallback: false, refusals: candidates.map((profile) => ({ profile, reason: "REQUEST_INVALID" })) };
    }
    const eligible: { ref: VersionRef; health: HealthState; index: number }[] = [];
    candidates.forEach((ref, index) => {
      const key = `${ref.id}@${ref.version}`;
      const p = this.#profiles.get(key);
      const refuse = (reason: string) => refusals.push({ profile: ref, reason });
      if (!p) return refuse("UNKNOWN");
      if (this.modelState(ref) !== "ADMITTED") return refuse("NOT_ADMITTED");
      if (this.isDisabled({ provider: p.provider, model: p.id, capability: request.capabilityId })) return refuse("KILL_SWITCH");
      if (!p.allowedTaskClasses.includes(request.taskClass)) return refuse("TASK_CLASS_NOT_ADMITTED");
      if (!p.allowedAgentClasses.includes(request.agentClass)) return refuse("AGENT_CLASS_NOT_ADMITTED");
      if (!request.dataClasses.every((c) => p.allowedDataClasses.includes(c))) return refuse("DATA_CLASS_NOT_ADMITTED");
      if (!agentClass.capabilities.includes(request.capabilityId)) return refuse("CAPABILITY_NOT_IN_AGENT_CLASS");
      if (!request.dataClasses.every((c) => agentClass.dataCeiling.includes(c))) return refuse("ABOVE_AGENT_DATA_CEILING");
      if (!RESIDENCY_LOCATIONS[request.residency].includes(p.deploymentLocation)) return refuse("RESIDENCY");
      if (request.runtimeClass !== undefined && p.runtimeClass !== request.runtimeClass) return refuse("RUNTIME_CLASS");
      if (index > 0) {
        // A fallback never widens the primary's boundary.
        if (DEPLOYMENT_LOCATIONS.indexOf(p.deploymentLocation) > DEPLOYMENT_LOCATIONS.indexOf(primary.deploymentLocation)) return refuse("FALLBACK_WIDENS_RESIDENCY");
        if (primary.runtimeClass === "LOCAL" && p.runtimeClass === "REMOTE") return refuse("FALLBACK_LOCAL_TO_REMOTE");
        // Another egress provider means other data-use and retention terms (AIF-02A manifest).
        if (p.egressProviderId !== primary.egressProviderId) {
          return refuse("FALLBACK_WIDENS_DATA_USE");
        }
      }
      const health = this.#healthAt(key, now);
      if (health === "DOWN") return refuse("UNHEALTHY_OR_STALE");
      eligible.push({ ref, health, index });
    });
    const pick = eligible.find((item) => item.health === "HEALTHY") ?? eligible[0];
    return { chosen: pick ? { id: pick.ref.id, version: pick.ref.version } : null, usedFallback: pick ? pick.index > 0 : false, refusals };
  }

  // -- binding -------------------------------------------------------------

  async bindInvocation(profileRef: VersionRef, promptRef: VersionRef): Promise<InvocationBinding> {
    const profile = this.#profiles.get(`${profileRef.id}@${profileRef.version}`);
    const prompt = this.#prompts.get(`${promptRef.id}@${promptRef.version}`);
    if (!profile || !prompt) fail("REGISTRY_UNKNOWN", "unknown model profile or prompt version");
    if (!prompt.compatibleModels.includes(profile.id)) fail("REGISTRY_INCOMPATIBLE", "prompt is not compatible with this model");
    if (prompt.outputSchema.id !== profile.structuredOutputSchema.id || prompt.outputSchema.version !== profile.structuredOutputSchema.version) {
      fail("REGISTRY_INCOMPATIBLE", "prompt and model must use the same structured output schema");
    }
    if (prompt.allowedCapabilities.length > 0 && !profile.toolUseAllowed) fail("REGISTRY_INCOMPATIBLE", "a prompt with capabilities needs a model admitted for tool use");
    if (!profile.allowedAgentClasses.includes(prompt.agentClass) || !profile.allowedTaskClasses.includes(prompt.taskClass)) {
      fail("REGISTRY_INCOMPATIBLE", "model profile is not admitted for the prompt's agent or task class");
    }
    const body = {
      profile: { id: profile.id, version: profile.version },
      modelRevision: profile.modelRevision,
      profileDigest: this.#profileDigests.get(`${profile.id}@${profile.version}`) as string,
      prompt: { id: prompt.id, version: prompt.version },
      instructionDigest: prompt.instructionDigest,
      safetyPolicyVersion: prompt.safetyPolicyVersion,
      outputSchema: { ...prompt.outputSchema },
      evaluationBundleDigest: prompt.evaluationBundleDigest,
      agentClass: prompt.agentClass,
    };
    this.#assertLive(body);
    return deepFreeze({ ...body, bindingDigest: `bnd_${await sha256Hex(canonicalJson(body))}` });
  }

  // Called by the runtime before every dispatch step: a kill switch, revocation, suspension or
  // retirement stops in-flight work at its next step.
  assertBindingLive(binding: InvocationBinding): void {
    this.#assertLive(binding);
  }

  #assertLive(binding: Omit<InvocationBinding, "bindingDigest">): void {
    const profile = this.#profiles.get(`${binding.profile.id}@${binding.profile.version}`);
    if (!profile) fail("REGISTRY_UNKNOWN", "unknown model profile");
    if (this.modelState(binding.profile) !== "ADMITTED") fail("REGISTRY_NOT_EXECUTABLE", "model profile is not admitted");
    const rollout = this.promptState(binding.prompt);
    if (rollout !== "CANARY" && rollout !== "ACTIVE") fail("REGISTRY_NOT_EXECUTABLE", "prompt is not in canary or active rollout");
    const prompt = this.#prompts.get(`${binding.prompt.id}@${binding.prompt.version}`);
    if (!prompt) fail("REGISTRY_UNKNOWN", "unknown prompt");
    if (
      binding.modelRevision !== profile.modelRevision ||
      binding.instructionDigest !== prompt.instructionDigest ||
      binding.profileDigest !== this.#profileDigests.get(`${profile.id}@${profile.version}`) ||
      binding.agentClass !== prompt.agentClass ||
      binding.safetyPolicyVersion !== prompt.safetyPolicyVersion ||
      binding.evaluationBundleDigest !== prompt.evaluationBundleDigest ||
      binding.outputSchema.id !== prompt.outputSchema.id ||
      binding.outputSchema.version !== prompt.outputSchema.version
    ) {
      fail("REGISTRY_INVALID", "binding does not match the registered versions");
    }
    if (prompt.allowedCapabilities.some((capability) => this.isDisabled({ capability }))) fail("REGISTRY_DISABLED", "a prompt capability is disabled");
    if (this.isDisabled({ provider: profile.provider, model: profile.id, prompt: binding.prompt.id })) {
      fail("REGISTRY_DISABLED", "disabled by a kill switch");
    }
  }
}
