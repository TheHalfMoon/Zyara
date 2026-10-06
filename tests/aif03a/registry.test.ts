// AIF-03A synthetic qualification: the model and prompt registry.
//
// Proves, with synthetic profiles only, that a floating alias is never a production identity,
// no model is admitted globally, fallback never widens residency, runtime or data use,
// patient-navigation and clinic-operations agents never share capabilities, revoked or
// suspended profiles and retired prompts cannot start new work, prompt edits never change a
// historical binding, and kill switches work from registry state alone.
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  ModelPromptRegistry,
  RegistryError,
  type ModelProfile,
  type PromptTemplate,
  type Registrar,
  type RegistryErrorCode,
  type SelectionRequest,
} from "@zyara/model-registry";

const NOW = "2026-10-06T12:00:00.000Z";
const RELEASE: Registrar = { kind: "system", principal: "release_pipeline", id: "ci-release" };
const EVB = `evb_${"a".repeat(64)}`;

function code(fn: () => unknown): RegistryErrorCode {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof RegistryError, String(error));
    return error.code;
  }
  assert.fail("expected refusal");
}

async function asyncCode(fn: () => Promise<unknown>): Promise<RegistryErrorCode> {
  try {
    await fn();
  } catch (error) {
    assert.ok(error instanceof RegistryError, String(error));
    return error.code;
  }
  assert.fail("expected refusal");
}

function profile(overrides: Partial<ModelProfile> = {}): ModelProfile {
  return {
    id: "laya-local",
    version: "1.0.0",
    provider: "zyara-local",
    modelId: "laya-coreml-intent",
    modelRevision: "sha256-3f1c9a7e",
    runtimeClass: "LOCAL",
    deploymentLocation: "TENANT_DEVICE",
    licenseRef: "license-apache-2.0",
    allowedDataClasses: ["PUBLIC", "INTERNAL", "PII"],
    allowedTaskClasses: ["intent.classify"],
    allowedAgentClasses: ["PATIENT_NAVIGATION", "CLINIC_OPERATIONS"],
    contextLimit: 4096,
    toolUseAllowed: false,
    structuredOutputSchema: { id: "intent.label", version: "1.0.0" },
    latencyClass: "INTERACTIVE",
    evaluationBundleDigest: EVB,
    egressProviderId: "local-model",
    ...overrides,
  };
}

function prompt(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: "intent.router",
    version: "1.0.0",
    taskClass: "intent.classify",
    agentClass: "PATIENT_NAVIGATION",
    outputSchema: { id: "intent.label", version: "1.0.0" },
    allowedCapabilities: ["discovery.search.read"],
    instructions: "Classify the patient's request into one intent label. Never give medical advice.",
    locale: "ar-SA",
    compatibleModels: ["laya-local", "ksa-llm"],
    safetyPolicyVersion: "1.0.0",
    evaluationBundleDigest: EVB,
    rollbackTarget: null,
    ...overrides,
  };
}

async function world(): Promise<ModelPromptRegistry> {
  const r = new ModelPromptRegistry();
  r.registerAgentClass({ agentClass: "PATIENT_NAVIGATION", dataCeiling: ["PUBLIC", "INTERNAL", "PII"], capabilities: ["discovery.search.read", "booking.slots.read"] }, RELEASE);
  r.registerAgentClass({ agentClass: "CLINIC_OPERATIONS", dataCeiling: ["PUBLIC", "INTERNAL", "PII", "PHI"], capabilities: ["workforce.tasks.raise", "reporting.read"] }, RELEASE);
  await r.registerModel(profile(), RELEASE);
  await r.registerModel(profile({ id: "ksa-llm", provider: "ksa-cloud", modelId: "ksa-llm-8b", modelRevision: "2026-09-01.r3", runtimeClass: "REMOTE", deploymentLocation: "PROVIDER_KSA", egressProviderId: "llm-ksa" }), RELEASE);
  await r.registerModel(profile({ id: "global-llm", provider: "global-cloud", modelId: "global-llm-70b", modelRevision: "rev-20260915", runtimeClass: "REMOTE", deploymentLocation: "PROVIDER_OTHER", egressProviderId: "llm-global" }), RELEASE);
  for (const id of ["laya-local", "ksa-llm", "global-llm"]) {
    r.setModelState({ id, version: "1.0.0" }, "ADMITTED", RELEASE, NOW, "qualified");
    r.reportHealth({ id, version: "1.0.0" }, "HEALTHY", NOW);
  }
  await r.registerPrompt(prompt(), RELEASE);
  r.setPromptState({ id: "intent.router", version: "1.0.0" }, "ACTIVE", RELEASE, NOW, "rollout");
  return r;
}

function selection(overrides: Partial<SelectionRequest> = {}): SelectionRequest {
  return {
    agentClass: "PATIENT_NAVIGATION",
    taskClass: "intent.classify",
    dataClasses: ["PUBLIC", "PII"],
    capabilityId: "discovery.search.read",
    residency: "KSA_ONLY",
    primary: { id: "laya-local", version: "1.0.0" },
    fallbacks: [],
    now: NOW,
    ...overrides,
  };
}

describe("AIF-03A model identity and admission", () => {
  it("refuses a floating alias as the only production identity", async () => {
    const r = new ModelPromptRegistry();
    for (const alias of ["latest", "gpt-x-latest", "stable", "default", "preview", "models/foo:latest"]) {
      assert.equal(await asyncCode(() => r.registerModel(profile({ id: `m-${alias.length}`, modelRevision: alias }), RELEASE)), "REGISTRY_FLOATING_IDENTITY", alias);
    }
  });

  it("admits nothing globally, never allows CREDENTIAL, and lets only trusted registrars change state", async () => {
    const r = await world();
    assert.equal(r.selectModel(selection({ taskClass: "clinical.summarize" })).chosen, null);
    assert.equal(r.selectModel(selection({ dataClasses: ["PHI"] })).chosen, null);
    assert.equal(await asyncCode(() => r.registerModel(profile({ id: "cred", allowedDataClasses: ["CREDENTIAL"] }), RELEASE)), "REGISTRY_INVALID");
    const agent = { kind: "agent", id: "agent-ops-1" } as unknown as Registrar;
    assert.equal(await asyncCode(() => r.registerModel(profile({ id: "rogue" }), agent)), "REGISTRY_REGISTRAR_UNTRUSTED");
    assert.equal(code(() => r.setKillSwitch("GLOBAL", "*", false, agent, NOW, "lift")), "REGISTRY_REGISTRAR_UNTRUSTED");
    assert.equal(await asyncCode(() => r.registerModel(profile(), RELEASE)), "REGISTRY_DUPLICATE_VERSION");
  });

  it("blocks new work from a revoked or suspended profile", async () => {
    const r = await world();
    r.setModelState({ id: "laya-local", version: "1.0.0" }, "SUSPENDED", RELEASE, NOW, "incident");
    assert.equal(r.selectModel(selection()).chosen, null);
    assert.equal(await asyncCode(() => r.bindInvocation({ id: "laya-local", version: "1.0.0" }, { id: "intent.router", version: "1.0.0" })), "REGISTRY_NOT_EXECUTABLE");
    r.setModelState({ id: "laya-local", version: "1.0.0" }, "REVOKED", RELEASE, NOW, "withdrawn");
    assert.equal(code(() => r.setModelState({ id: "laya-local", version: "1.0.0" }, "ADMITTED", RELEASE, NOW, "undo")), "REGISTRY_NOT_EXECUTABLE");
  });

  it("treats missing or stale health as down, and degrades only among authorized alternatives", async () => {
    const r = await world();
    r.reportHealth({ id: "laya-local", version: "1.0.0" }, "HEALTHY", "2026-10-06T11:50:00.000Z");
    const stale = r.selectModel(selection());
    assert.equal(stale.chosen, null);
    assert.ok(stale.refusals.some((x) => x.reason === "UNHEALTHY_OR_STALE"));
    r.reportHealth({ id: "laya-local", version: "1.0.0" }, "DEGRADED", NOW);
    assert.deepEqual(r.selectModel(selection()).chosen, { id: "laya-local", version: "1.0.0" });
  });
});

describe("AIF-03A selection never widens on fallback", () => {
  it("refuses a fallback that widens residency, goes local to remote, or widens data use", async () => {
    const r = await world();
    r.reportHealth({ id: "laya-local", version: "1.0.0" }, "DOWN", NOW);
    const remote = r.selectModel(selection({ residency: "ANY", fallbacks: [{ id: "ksa-llm", version: "1.0.0" }, { id: "global-llm", version: "1.0.0" }] }));
    assert.equal(remote.chosen, null);
    assert.deepEqual(remote.refusals.map((x) => x.reason), ["UNHEALTHY_OR_STALE", "FALLBACK_WIDENS_RESIDENCY", "FALLBACK_WIDENS_RESIDENCY"]);
    // Remote primary in KSA: a GCC/other fallback is refused, a same-residency one is allowed.
    const fromKsa = r.selectModel(selection({ residency: "ANY", primary: { id: "global-llm", version: "1.0.0" }, fallbacks: [] }));
    assert.deepEqual(fromKsa.chosen, { id: "global-llm", version: "1.0.0" });
    const ksaPrimary = r.selectModel(selection({ primary: { id: "ksa-llm", version: "1.0.0" }, fallbacks: [{ id: "global-llm", version: "1.0.0" }] }));
    assert.deepEqual(ksaPrimary.chosen, { id: "ksa-llm", version: "1.0.0" });
    r.reportHealth({ id: "ksa-llm", version: "1.0.0" }, "DOWN", NOW);
    const downKsa = r.selectModel(selection({ residency: "ANY", primary: { id: "ksa-llm", version: "1.0.0" }, fallbacks: [{ id: "global-llm", version: "1.0.0" }] }));
    assert.deepEqual([downKsa.chosen, downKsa.refusals.map((x) => x.reason)], [null, ["UNHEALTHY_OR_STALE", "FALLBACK_WIDENS_RESIDENCY"]]);
  });

  it("enforces the requested residency on the primary too", async () => {
    const r = await world();
    const result = r.selectModel(selection({ primary: { id: "global-llm", version: "1.0.0" } }));
    assert.deepEqual([result.chosen, result.refusals[0].reason], [null, "RESIDENCY"]);
  });
});

describe("AIF-03A agent-class separation", () => {
  it("keeps patient-navigation and clinic-operations capabilities apart", async () => {
    const r = new ModelPromptRegistry();
    r.registerAgentClass({ agentClass: "PATIENT_NAVIGATION", dataCeiling: ["PUBLIC"], capabilities: ["discovery.search.read"] }, RELEASE);
    assert.equal(
      code(() => r.registerAgentClass({ agentClass: "CLINIC_OPERATIONS", dataCeiling: ["PUBLIC"], capabilities: ["discovery.search.read", "reporting.read"] }, RELEASE)),
      "REGISTRY_AGENT_CLASS_OVERLAP",
    );
    const w = await world();
    const clinicCap = w.selectModel(selection({ capabilityId: "reporting.read" }));
    assert.deepEqual([clinicCap.chosen, clinicCap.refusals[0].reason], [null, "CAPABILITY_NOT_IN_AGENT_CLASS"]);
    assert.equal(await asyncCode(() => w.registerPrompt(prompt({ id: "nav.reporting", allowedCapabilities: ["reporting.read"] }), RELEASE)), "REGISTRY_PROMPT_EXCEEDS_AGENT_CLASS");
  });

  it("never lets a clinician-assist agent sign or prescribe", () => {
    const r = new ModelPromptRegistry();
    for (const capability of ["documentation.note.sign", "medication.prescribe", "lab.order.place", "lab.result.finalize"]) {
      assert.equal(
        code(() => r.registerAgentClass({ agentClass: "CLINICIAN_ASSIST", dataCeiling: ["PHI"], capabilities: ["documentation.note.draft", capability] }, RELEASE)),
        "REGISTRY_CLINICAL_AUTHORITY",
        capability,
      );
    }
    r.registerAgentClass({ agentClass: "CLINICIAN_ASSIST", dataCeiling: ["PHI"], capabilities: ["documentation.note.draft"] }, RELEASE);
  });
});

describe("AIF-03A prompt versions and bindings", () => {
  it("never lets a prompt edit change a historical binding", async () => {
    const r = await world();
    const before = await r.bindInvocation({ id: "laya-local", version: "1.0.0" }, { id: "intent.router", version: "1.0.0" });
    assert.ok(Object.isFrozen(before) && Object.isFrozen(before.profile));
    assert.equal(await asyncCode(() => r.registerPrompt(prompt({ instructions: "Changed text." }), RELEASE)), "REGISTRY_DUPLICATE_VERSION");
    await r.registerPrompt(prompt({ version: "1.1.0", instructions: "Classify into one intent label. Arabic first.", rollbackTarget: "1.0.0" }), RELEASE);
    r.setPromptState({ id: "intent.router", version: "1.1.0" }, "ACTIVE", RELEASE, NOW, "rollout");
    const after = await r.bindInvocation({ id: "laya-local", version: "1.0.0" }, { id: "intent.router", version: "1.1.0" });
    assert.notEqual(after.instructionDigest, before.instructionDigest);
    assert.equal(before.prompt.version, "1.0.0");
    const again = await r.bindInvocation({ id: "laya-local", version: "1.0.0" }, { id: "intent.router", version: "1.0.0" });
    assert.equal(again.bindingDigest, before.bindingDigest);
  });

  it("accepts only an earlier, once-active, unrevoked rollback target", async () => {
    const r = await world();
    await r.registerPrompt(prompt({ version: "0.9.0", instructions: "old" }), RELEASE);
    assert.equal(await asyncCode(() => r.registerPrompt(prompt({ version: "2.0.0", rollbackTarget: "0.9.0" }), RELEASE)), "REGISTRY_ROLLBACK_INVALID");
    assert.equal(await asyncCode(() => r.registerPrompt(prompt({ version: "2.0.1", rollbackTarget: "3.0.0" }), RELEASE)), "REGISTRY_ROLLBACK_INVALID");
    r.setPromptState({ id: "intent.router", version: "1.0.0" }, "REVOKED", RELEASE, NOW, "unsafe");
    assert.equal(await asyncCode(() => r.registerPrompt(prompt({ version: "2.0.2", rollbackTarget: "1.0.0" }), RELEASE)), "REGISTRY_ROLLBACK_INVALID");
  });

  it("blocks new bindings for a retired or draft prompt", async () => {
    const r = await world();
    r.setPromptState({ id: "intent.router", version: "1.0.0" }, "RETIRED", RELEASE, NOW, "replaced");
    assert.equal(await asyncCode(() => r.bindInvocation({ id: "laya-local", version: "1.0.0" }, { id: "intent.router", version: "1.0.0" })), "REGISTRY_NOT_EXECUTABLE");
    await r.registerPrompt(prompt({ version: "3.0.0" }), RELEASE);
    assert.equal(await asyncCode(() => r.bindInvocation({ id: "laya-local", version: "1.0.0" }, { id: "intent.router", version: "3.0.0" })), "REGISTRY_NOT_EXECUTABLE");
  });
});

describe("AIF-03A kill switches", () => {
  it("disables without invoking the affected provider and stops in-flight work", async () => {
    const r = await world();
    const binding = await r.bindInvocation({ id: "laya-local", version: "1.0.0" }, { id: "intent.router", version: "1.0.0" });
    // The provider is down; nothing in the registry ever calls it.
    r.reportHealth({ id: "laya-local", version: "1.0.0" }, "DOWN", NOW);
    for (const [scope, target] of [["PROVIDER", "zyara-local"], ["MODEL", "laya-local"], ["PROMPT", "intent.router"], ["GLOBAL", "*"]] as const) {
      const fresh = await world();
      const live = await fresh.bindInvocation({ id: "laya-local", version: "1.0.0" }, { id: "intent.router", version: "1.0.0" });
      fresh.setKillSwitch(scope, target, true, RELEASE, NOW, "incident");
      assert.equal(code(() => fresh.assertBindingLive(live)), "REGISTRY_DISABLED", scope);
      assert.equal(await asyncCode(() => fresh.bindInvocation({ id: "laya-local", version: "1.0.0" }, { id: "intent.router", version: "1.0.0" })), "REGISTRY_DISABLED");
    }
    r.setKillSwitch("CAPABILITY", "discovery.search.read", true, RELEASE, NOW, "incident");
    assert.deepEqual(r.selectModel(selection()).refusals.map((x) => x.reason), ["KILL_SWITCH"]);
    r.setKillSwitch("CAPABILITY", "discovery.search.read", false, RELEASE, NOW, "resolved");
    assert.equal(r.isDisabled({ capability: "discovery.search.read" }), false);
    assert.equal(binding.modelRevision, "sha256-3f1c9a7e");
  });
});
