// N5/C4 audit-chain qualification API.
//
// C4 answers one question over HTTP: can an important action be reconstructed from the
// records the owning slices already keep? It reads; it owns nothing; it writes nothing.
//
// Every reader below is bound to one source domain and returns evidence entries for one
// correlation id inside one tenant. The assembly refuses a foreign tenant, a foreign branch
// or a foreign correlation id instead of widening the chain, and it reports the steps that
// carry no evidence as gaps rather than filling them in.
//
// Audit reconstruction is a compliance surface, so it is tenant-wide and administrator-only
// today: a branch-scoped operator cannot reconstruct a cross-branch chain, and a clinical
// role is not silently granted audit access.
import type { FastifyInstance } from "fastify";
import {
  AUDIT_CHAIN_PROFILES,
  AUDIT_CHAIN_PROFILE_NAMES,
  AUDIT_CHAIN_STEPS,
  AUDIT_CHAIN_GAP_REGISTER,
  AuditChainError,
  assembleAuditChain,
  chainFingerprint,
  isAuditChainReference,
  summariseAuditChain,
  type AuditChainEntry,
  type AuditChainReader,
  type AuditChainReaderEntry,
  type AuditChainSourceDomain,
} from "@zyara/collaboration";
import { agentIdentityStore } from "./agents.js";
import { approvalStore } from "./approvals.js";
import { activityStore } from "./activity.js";
import { taskStore } from "./tasks.js";
import { coverageStore } from "./coverage.js";
import { whatsappReceiptStore } from "./whatsapp.js";
import { authorize, requestTenant } from "./auth.js";
import { workforceMembershipsFor } from "./workforce.js";

function bounded(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return /^[A-Za-z0-9_.:-]{1,128}$/.test(trimmed) ? trimmed : null;
}

// A source may hold free text in a field the chain would otherwise quote as evidence (an
// origin reference, a provider message reference). The chain never quotes prose: an
// unacceptable value becomes "unknown" rather than a malformed report.
function safeRef(value: string | null | undefined): string | null {
  return typeof value === "string" && isAuditChainReference(value) ? value : null;
}

function entry(
  sourceDomain: AuditChainSourceDomain,
  input: {
    step: AuditChainEntry["step"];
    recordRef: string;
    occurredAt: string;
    actorKind: AuditChainEntry["actorKind"];
    actorRef?: string | null;
    outcomeCode?: string | null;
    tenantId: string;
    branchId: string | null;
    correlationId: string;
  },
): AuditChainReaderEntry {
  return {
    step: input.step,
    sourceDomain,
    recordRef: input.recordRef,
    occurredAt: input.occurredAt,
    actorKind: input.actorKind,
    actorRef: input.actorRef ?? null,
    outcomeCode: input.outcomeCode ?? null,
    tenantId: input.tenantId,
    branchId: input.branchId,
    correlationId: input.correlationId,
  };
}

// W3 task queue: the task is the typed operational action, and its append-only event trail
// carries the status changes, including a blocked or reopened task that evidences a retry.
export const taskChainReader: AuditChainReader = {
  sourceDomain: "workforce.tasks",
  read(query) {
    const out: AuditChainReaderEntry[] = [];
    for (const task of taskStore.listTasks(query.tenantId)) {
      if (task.correlationId !== query.correlationId) continue;
      const actorKind = task.origin.kind === "human" ? "human" : "system";
      out.push(
        entry("workforce.tasks", {
          step: "initiator",
          recordRef: `ops-task:${task.id}`,
          occurredAt: task.createdAt,
          actorKind,
          actorRef: safeRef(task.origin.ref),
          outcomeCode: task.kind,
          tenantId: task.tenantId,
          branchId: task.branchId,
          correlationId: query.correlationId,
        }),
        entry("workforce.tasks", {
          step: "identity",
          recordRef: `ops-task:${task.id}`,
          occurredAt: task.createdAt,
          actorKind: "human",
          actorRef: safeRef(task.requesterAccountId),
          outcomeCode: task.priority,
          tenantId: task.tenantId,
          branchId: task.branchId,
          correlationId: query.correlationId,
        }),
        entry("workforce.tasks", {
          step: "typed_action",
          recordRef: `ops-task:${task.id}`,
          occurredAt: task.createdAt,
          actorKind,
          actorRef: safeRef(task.origin.ref),
          outcomeCode: "created",
          tenantId: task.tenantId,
          branchId: task.branchId,
          correlationId: query.correlationId,
        }),
        entry("workforce.tasks", {
          step: "canonical_outcome",
          recordRef: `ops-task:${task.id}`,
          occurredAt: task.updatedAt,
          actorKind: "human",
          actorRef: safeRef(task.assigneeAccountId ?? task.requesterAccountId),
          outcomeCode: task.status,
          tenantId: task.tenantId,
          branchId: task.branchId,
          correlationId: query.correlationId,
        }),
      );
      for (const event of taskStore.listEvents(task.id, query.tenantId)) {
        if (event.fromStatus === null) continue;
        if (event.toStatus !== "blocked" && event.fromStatus !== "blocked" && event.fromStatus !== "resolved") {
          continue;
        }
        out.push(
          entry("workforce.tasks", {
            step: "failure_retry",
            recordRef: `ops-task-event:${event.id}`,
            occurredAt: event.occurredAt,
            actorKind: event.actor.kind === "human" ? "human" : "system",
            actorRef: safeRef(event.actor.accountId),
            outcomeCode: event.toStatus,
            tenantId: event.tenantId,
            branchId: task.branchId,
            correlationId: query.correlationId,
          }),
        );
      }
    }
    return out;
  },
};

// C1 bounded agent identities: the identity that acted, and the authority or capability that
// applied to it.
export const agentChainReader: AuditChainReader = {
  sourceDomain: "identity.agents",
  read(query) {
    const out: AuditChainReaderEntry[] = [];
    for (const identity of agentIdentityStore.listIdentities(query.tenantId)) {
      if (identity.correlationId !== query.correlationId) continue;
      out.push(
        entry("identity.agents", {
          step: "identity",
          recordRef: `agent:${identity.id}`,
          occurredAt: identity.createdAt,
          actorKind: "agent",
          actorRef: identity.id,
          outcomeCode: identity.kind,
          tenantId: identity.tenantId,
          branchId: identity.branchId,
          correlationId: query.correlationId,
        }),
      );
      for (const event of agentIdentityStore.listEvents(identity.id, query.tenantId)) {
        if (event.capability === null) continue;
        out.push(
          entry("identity.agents", {
            step: "authority",
            recordRef: `agent-identity-event:${event.id}`,
            occurredAt: event.occurredAt,
            actorKind: event.actor.kind === "human" ? "human" : "agent",
            actorRef: safeRef(event.actor.accountId),
            outcomeCode: event.action,
            tenantId: event.tenantId,
            branchId: identity.branchId,
            correlationId: query.correlationId,
          }),
        );
      }
    }
    return out;
  },
};

// W2 coverage exceptions: advisory workforce conflicts, now joinable because C4 added a
// correlation reference to the record.
export const coverageChainReader: AuditChainReader = {
  sourceDomain: "workforce.coverage",
  read(query) {
    const out: AuditChainReaderEntry[] = [];
    for (const exception of coverageStore.list(query.tenantId)) {
      if ((exception.correlationId ?? null) !== query.correlationId) continue;
      out.push(
        entry("workforce.coverage", {
          step: "initiator",
          recordRef: `coverage-exception:${exception.id}`,
          occurredAt: exception.provenance.observedAt,
          actorKind: "system",
          actorRef: "coverage-detector",
          outcomeCode: exception.kind,
          tenantId: exception.tenantId,
          branchId: exception.branchId,
          correlationId: query.correlationId,
        }),
        entry("workforce.coverage", {
          step: "canonical_outcome",
          recordRef: `coverage-exception:${exception.id}`,
          occurredAt: exception.provenance.observedAt,
          actorKind: "system",
          actorRef: "coverage-detector",
          outcomeCode: exception.status,
          tenantId: exception.tenantId,
          branchId: exception.branchId,
          correlationId: query.correlationId,
        }),
      );
    }
    return out;
  },
};

// W4 verified inbound provider events: the external action and the receipt it returned. The
// provider supplies no Zyara correlation id, so C4 mints a deterministic receipt correlation
// reference at the boundary and this reader joins on it.
export const whatsappChainReader: AuditChainReader = {
  sourceDomain: "communications.whatsapp",
  read(query) {
    const out: AuditChainReaderEntry[] = [];
    for (const receipt of whatsappReceiptStore.listForTenant(query.tenantId)) {
      if (receipt.correlationRef !== query.correlationId) continue;
      out.push(
        entry("communications.whatsapp", {
          step: "external_action",
          recordRef: `whatsapp-receipt:${receipt.id}`,
          occurredAt: receipt.receivedAt,
          actorKind: "external",
          actorRef: safeRef(receipt.providerMessageRef),
          outcomeCode: receipt.kind,
          tenantId: receipt.tenantId,
          // The provider event belongs to the tenant's messaging account, not to a branch.
          branchId: null,
          correlationId: query.correlationId,
        }),
        entry("communications.whatsapp", {
          step: "receipt",
          recordRef: `whatsapp-receipt:${receipt.id}`,
          occurredAt: receipt.receivedAt,
          actorKind: "external",
          actorRef: safeRef(receipt.providerMessageRef),
          // A provider status is free text, so the chain records only that the provider
          // reported something rather than quoting it into evidence.
          outcomeCode: receipt.status === null ? null : "provider_reported",
          tenantId: receipt.tenantId,
          branchId: null,
          correlationId: query.correlationId,
        }),
      );
    }
    return out;
  },
};

// C3 approvals: the policy decision, the required authority, the human approval itself, the
// typed execution attempt, the receipt and any failure or retry.
export const approvalChainReader: AuditChainReader = {
  sourceDomain: "collaboration.approvals",
  read(query) {
    const out: AuditChainReaderEntry[] = [];
    for (const request of approvalStore.listRequests(query.tenantId)) {
      if (request.correlationId !== query.correlationId) continue;
      out.push(
        entry("collaboration.approvals", {
          step: "authority",
          recordRef: `approval-request:${request.id}`,
          occurredAt: request.createdAt,
          actorKind: request.requesterKind === "agent" ? "agent" : "human",
          actorRef: request.requesterAccountId ?? request.requesterAgentId ?? request.requesterRef,
          outcomeCode: request.requiredAuthority,
          tenantId: request.tenantId,
          branchId: request.branchId,
          correlationId: query.correlationId,
        }),
        entry("collaboration.approvals", {
          step: "policy_decision",
          recordRef: `approval-request:${request.id}`,
          occurredAt: request.createdAt,
          actorKind: request.requesterKind === "agent" ? "agent" : "human",
          actorRef: request.requesterAccountId ?? request.requesterAgentId ?? request.requesterRef,
          outcomeCode: request.riskClass,
          tenantId: request.tenantId,
          branchId: request.branchId,
          correlationId: query.correlationId,
        }),
        entry("collaboration.approvals", {
          step: "typed_action",
          recordRef: `approval-request:${request.id}`,
          occurredAt: request.createdAt,
          actorKind: request.requesterKind === "agent" ? "agent" : "human",
          actorRef: request.requesterAccountId ?? request.requesterAgentId ?? request.requesterRef,
          outcomeCode: request.actionType,
          tenantId: request.tenantId,
          branchId: request.branchId,
          correlationId: query.correlationId,
        }),
        entry("collaboration.approvals", {
          step: "canonical_outcome",
          recordRef: `approval-request:${request.id}`,
          occurredAt: request.updatedAt,
          actorKind: "system",
          actorRef: "approval-state-machine",
          outcomeCode: request.status,
          tenantId: request.tenantId,
          branchId: request.branchId,
          correlationId: query.correlationId,
        }),
      );
      for (const decision of approvalStore.decisionsFor(request.id, query.tenantId)) {
        out.push(
          entry("collaboration.approvals", {
            step: "human_approval",
            recordRef: `approval-decision:${decision.id}`,
            occurredAt: decision.decidedAt,
            actorKind: "human",
            actorRef: decision.approverAccountId,
            outcomeCode: decision.outcome,
            tenantId: decision.tenantId,
            branchId: request.branchId,
            correlationId: query.correlationId,
          }),
        );
      }
      for (const execution of approvalStore.executionsFor(request.id, query.tenantId)) {
        out.push(
          entry("collaboration.approvals", {
            step: execution.outcome === "succeeded" || execution.outcome === "failed" ? "receipt" : "typed_action",
            recordRef: `approval-execution:${execution.id}`,
            occurredAt: execution.occurredAt,
            actorKind:
              execution.executorKind === "agent"
                ? "agent"
                : execution.executorKind === "human"
                  ? "human"
                  : "system",
            actorRef:
              execution.executorAccountId ?? execution.executorAgentId ?? execution.executorRef,
            outcomeCode: execution.outcome,
            tenantId: execution.tenantId,
            branchId: request.branchId,
            correlationId: query.correlationId,
          }),
        );
        if (execution.outcome === "failed" || execution.outcome === "unknown") {
          out.push(
            entry("collaboration.approvals", {
              step: "failure_retry",
              recordRef: `approval-execution:${execution.id}`,
              occurredAt: execution.occurredAt,
              actorKind: "system",
              actorRef: "approval-executor",
              outcomeCode: execution.outcome,
              tenantId: execution.tenantId,
              branchId: request.branchId,
              correlationId: query.correlationId,
            }),
          );
        }
      }
    }
    return out;
  },
};

// C3 exception queue: the human follow-up that owns an unresolved outcome.
export const exceptionChainReader: AuditChainReader = {
  sourceDomain: "collaboration.exceptions",
  read(query) {
    const out: AuditChainReaderEntry[] = [];
    for (const record of approvalStore.listExceptions(query.tenantId)) {
      if (record.correlationId !== query.correlationId) continue;
      out.push(
        entry("collaboration.exceptions", {
          step: "typed_action",
          recordRef: `exception-case:${record.id}`,
          occurredAt: record.openedAt,
          actorKind: "system",
          actorRef: "exception-queue",
          outcomeCode: record.kind,
          tenantId: record.tenantId,
          branchId: record.branchId,
          correlationId: query.correlationId,
        }),
        entry("collaboration.exceptions", {
          step: "canonical_outcome",
          recordRef: `exception-case:${record.id}`,
          occurredAt: record.updatedAt,
          actorKind: "human",
          actorRef: null,
          outcomeCode: record.status,
          tenantId: record.tenantId,
          branchId: record.branchId,
          correlationId: query.correlationId,
        }),
      );
      if (record.resolutionCode === "unknown_outcome") {
        out.push(
          entry("collaboration.exceptions", {
            step: "failure_retry",
            recordRef: `exception-case:${record.id}`,
            occurredAt: record.updatedAt,
            actorKind: "system",
            actorRef: "exception-queue",
            outcomeCode: record.resolutionCode,
            tenantId: record.tenantId,
            branchId: record.branchId,
            correlationId: query.correlationId,
          }),
        );
      }
    }
    return out;
  },
};

// C2 derived activity: proof that the derived projection was emitted for this chain, and the
// only step a reader may use to find the chain's own correlation id without owning state.
export const activityChainReader: AuditChainReader = {
  sourceDomain: "activity.projection",
  read(query) {
    const out: AuditChainReaderEntry[] = [];
    for (const record of activityStore.records.values()) {
      if (record.tenantId !== query.tenantId) continue;
      if (record.correlationId !== query.correlationId) continue;
      out.push(
        entry("activity.projection", {
          step: "derived_activity",
          recordRef: `activity:${record.id}`,
          occurredAt: record.occurredAt,
          actorKind:
            record.actorKind === "human"
              ? "human"
              : record.actorKind === "agent"
                ? "agent"
                : record.actorKind === "external"
                  ? "external"
                  : "system",
          actorRef: record.actorAccountId ?? record.actorAgentId ?? record.actorRef,
          outcomeCode: record.result,
          tenantId: record.tenantId,
          branchId: record.branchId,
          correlationId: query.correlationId,
        }),
      );
    }
    return out;
  },
};

export const AUDIT_CHAIN_READERS: readonly AuditChainReader[] = [
  taskChainReader,
  coverageChainReader,
  agentChainReader,
  whatsappChainReader,
  approvalChainReader,
  exceptionChainReader,
  activityChainReader,
];

export function registerAuditChainRoutes(app: FastifyInstance) {
  app.get("/workforce/audit-chain", async (req, reply) => {
    try {
      const query = (req.query ?? {}) as { correlationId?: string; profile?: string };
      const correlationId = bounded(query.correlationId);
      if (!correlationId) {
        return reply
          .code(400)
          .send({ error: "AUDIT_CHAIN_MALFORMED", detail: "correlationId is required" });
      }
      const profile = bounded(query.profile) ?? "approval_driven";
      if (!AUDIT_CHAIN_PROFILE_NAMES.includes(profile)) {
        return reply
          .code(400)
          .send({ error: "AUDIT_CHAIN_UNKNOWN_PROFILE", detail: `unknown profile: ${profile}` });
      }
      const { claims } = requestTenant(req);
      // Audit reconstruction is a tenant-wide administrator act. A branch-scoped operator is
      // refused rather than silently narrowed, and a clinical role alone is not sufficient.
      const decision = authorize(
        { claims, memberships: workforceMembershipsFor(claims.tenant, claims.sub) },
        {
          action: "workforce.audit_chain.read",
          resourceTenant: claims.tenant,
          requireAssurance: "aal2",
          allowRoles: ["org_admin"],
        },
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });

      const report = await assembleAuditChain(
        {
          tenantId: claims.tenant,
          branchId: null,
          correlationId,
          profile,
          asOf: new Date().toISOString(),
        },
        AUDIT_CHAIN_READERS,
      );
      return {
        ...report,
        summary: summariseAuditChain(report),
        // The register is returned with every report so an operator cannot mistake a
        // reconstruction for a complete chain of custody.
        gapRegister: AUDIT_CHAIN_GAP_REGISTER,
        chainSteps: AUDIT_CHAIN_STEPS,
        profileRequiredSteps: AUDIT_CHAIN_PROFILES[profile].requiredSteps,
      };
    } catch (error) {
      if (error instanceof AuditChainError) {
        const status =
          error.code === "AUDIT_CHAIN_CROSS_TENANT" || error.code === "AUDIT_CHAIN_CROSS_BRANCH"
            ? 403
            : 400;
        return reply.code(status).send({ error: error.code });
      }
      return reply.code(401).send({ error: "UNAUTHENTICATED" });
    }
  });

  // A deterministic reproducibility check: the same correlation id and profile must produce
  // the same fingerprint when nothing changed, and a different one when something did.
  app.get("/workforce/audit-chain/:correlationId/fingerprint", async (req, reply) => {
    try {
      const params = (req.params ?? {}) as { correlationId?: string };
      const correlationId = bounded(params.correlationId);
      if (!correlationId) {
        return reply.code(400).send({ error: "AUDIT_CHAIN_MALFORMED" });
      }
      const { claims } = requestTenant(req);
      const decision = authorize(
        { claims, memberships: workforceMembershipsFor(claims.tenant, claims.sub) },
        {
          action: "workforce.audit_chain.read",
          resourceTenant: claims.tenant,
          requireAssurance: "aal2",
          allowRoles: ["org_admin"],
        },
      );
      if (!decision.allow) return reply.code(403).send({ error: decision.denial });
      const report = await assembleAuditChain(
        {
          tenantId: claims.tenant,
          branchId: null,
          correlationId,
          profile: "approval_driven",
          asOf: new Date().toISOString(),
        },
        AUDIT_CHAIN_READERS,
      );
      return {
        correlationId,
        fingerprint: report.fingerprint,
        reconstructable: report.reconstructable,
        missingSteps: report.missingSteps,
        recomputed: await chainFingerprint(
          {
            tenantId: report.tenantId,
            branchId: report.branchId,
            correlationId: report.correlationId,
            profile: report.profile,
          },
          report.entries,
        ),
      };
    } catch (error) {
      if (error instanceof AuditChainError) {
        return reply.code(400).send({ error: error.code });
      }
      return reply.code(401).send({ error: "UNAUTHENTICATED" });
    }
  });
}
