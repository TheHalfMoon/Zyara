// N5/C2 authenticated HTTP smoke.
//
// This is the reusable route harness the repository has repeatedly recorded as
// missing: `buildServer()` plus Fastify `inject()`, with real synthetic OIDC bearer
// tokens and server-side memberships instead of a fabricated route-level shortcut.
// W3, W4, C1 and C2 all exercise it here, so a later slice can reuse the same shape
// instead of rebuilding an ad-hoc one.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { BranchRole } from "@zyara/authorization";
import type { Membership } from "@zyara/authorization";
import { buildServer } from "../src/index.js";
import { oidc } from "../src/auth.js";
import { replaceWorkforceMemberships } from "../src/workforce.js";
import { activityProjectionFailures } from "../src/activity.js";
import {
  clearWhatsappRuntimeAccounts,
  installWhatsappRuntimeAccount,
} from "../src/whatsapp.js";

const NOW_SEC = Math.floor(Date.now() / 1000);
const SECRET = "meta-app-secret-synthetic-only";
const VERIFY = "verify-token";

function membership(
  accountId: string,
  tenantId: string,
  branchId: string | null,
  role: BranchRole,
): Membership {
  return { accountId, tenantId, branchId, role, revoked: false, patientId: null };
}

function token(sub: string, tenant: string, assurance: "aal1" | "aal2" = "aal2"): string {
  return oidc.issue({ sub, sid: `sid-${sub}-${tenant}`, tenant, assurance, exp: NOW_SEC + 3600 });
}

function bearer(value: string) {
  return { authorization: `Bearer ${value}` };
}

function sign(body: string): string {
  return "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
}

// Tenant t1 has two branches, one clinician and one organisation administrator.
replaceWorkforceMemberships("t1", "account-admin", [membership("account-admin", "t1", null, "org_admin")]);
replaceWorkforceMemberships("t1", "account-aal1", [membership("account-aal1", "t1", null, "org_admin")]);
replaceWorkforceMemberships("t1", "account-front-b1", [membership("account-front-b1", "t1", "b1", "receptionist")]);
replaceWorkforceMemberships("t1", "account-front-b2", [membership("account-front-b2", "t1", "b2", "receptionist")]);
replaceWorkforceMemberships("t1", "account-clinician", [membership("account-clinician", "t1", "b1", "clinician")]);
replaceWorkforceMemberships("t2", "account-t2-admin", [membership("account-t2-admin", "t2", null, "org_admin")]);

clearWhatsappRuntimeAccounts();
installWhatsappRuntimeAccount({
  descriptor: {
    id: "wa-c2",
    tenantId: "t1",
    branchId: "b1",
    businessAccountId: "business-1",
    phoneNumberId: "phone-id-1",
    appSecretRef: "secret://synthetic/whatsapp/app-secret",
    verifyTokenRef: "secret://synthetic/whatsapp/verify-token",
    enabled: true,
    sourceRef: "n5c2-http-smoke",
    sourceRevision: process.env.ZYARA_BUILD ?? "n5c2-http-smoke",
  },
  appSecret: SECRET,
  verifyToken: VERIFY,
});

const app = buildServer();
await app.ready();

const admin = token("account-admin", "t1");
const frontB1 = token("account-front-b1", "t1");
const frontB2 = token("account-front-b2", "t1");
const clinician = token("account-clinician", "t1");
const lowAssurance = token("account-aal1", "t1", "aal1");
const tenantTwoAdmin = token("account-t2-admin", "t2");

// --- no read surface is reachable without a verified session -------------------
assert.equal((await app.inject({ method: "GET", url: "/workforce/activity" })).statusCode, 401);
assert.equal(
  (
    await app.inject({
      method: "GET",
      url: "/workforce/activity",
      headers: bearer(lowAssurance),
    })
  ).statusCode,
  403,
);

// --- there is deliberately no public activity write route ----------------------
const writeAttempt = await app.inject({
  method: "POST",
  url: "/workforce/activity",
  headers: bearer(admin),
  payload: { tenantId: "t1", sourceDomain: "workforce.tasks", action: "created" },
});
assert.equal(writeAttempt.statusCode, 404);

// --- W3 -> C2: an authoritative task operation derives operational activity -----
const taskResponse = await app.inject({
  method: "POST",
  url: "/workforce/tasks",
  headers: bearer(frontB1),
  payload: {
    id: "task-http-1",
    branchId: "b1",
    kind: "facility_helpdesk",
    title: "Synthetic clinic operations task",
    detail: "Synthetic detail that must never reach the activity feed",
    correlationId: "corr-http-1",
  },
});
assert.equal(taskResponse.statusCode, 201);

const branchFeed = await app.inject({
  method: "GET",
  url: "/workforce/activity?branchId=b1",
  headers: bearer(frontB1),
});
assert.equal(branchFeed.statusCode, 200);
const feed = branchFeed.json() as Array<Record<string, unknown>>;
const taskActivity = feed.find((row) => row.id === "activity-task-http-1-task-http-1:created");
assert.ok(taskActivity, "the derived task activity must be readable by the branch operator");
assert.equal(taskActivity.tenantId, "t1");
assert.equal(taskActivity.branchId, "b1");
assert.equal(taskActivity.actorKind, "human");
assert.equal(taskActivity.actorAccountId, "account-front-b1");
assert.equal(taskActivity.sourceDomain, "workforce.tasks");
assert.equal(taskActivity.sourceEventId, "task-http-1:created");
assert.equal(taskActivity.category, "task");
assert.equal(taskActivity.action, "created");
assert.equal(taskActivity.result, "observed");
assert.equal(taskActivity.sensitivity, "operational");
assert.equal(taskActivity.visibilityScope, "branch");
assert.equal(taskActivity.correlationId, "corr-http-1");
assert.equal(taskActivity.title, "Operational task created");
assert.deepEqual(taskActivity.payload, { originKind: "human", taskKind: "facility_helpdesk" });

// The feed row carries no task prose and no direct identifier.
const serialized = JSON.stringify(feed);
assert.ok(!serialized.includes("Synthetic clinic operations task"));
assert.ok(!serialized.includes("Synthetic detail"));

// --- branch and tenant boundaries ---------------------------------------------
const otherBranch = await app.inject({
  method: "GET",
  url: "/workforce/activity?branchId=b1",
  headers: bearer(frontB2),
});
assert.equal(otherBranch.statusCode, 403);

const tenantWideAttempt = await app.inject({
  method: "GET",
  url: "/workforce/activity",
  headers: bearer(frontB1),
});
assert.equal(tenantWideAttempt.statusCode, 403);

const adminFeed = await app.inject({
  method: "GET",
  url: "/workforce/activity",
  headers: bearer(admin),
});
assert.equal(adminFeed.statusCode, 200);
assert.ok((adminFeed.json() as unknown[]).length >= 1);

// A foreign tenant administrator cannot observe tenant t1 activity, even when it
// asks for a branch that exists only in t1.
const foreignFeed = await app.inject({
  method: "GET",
  url: "/workforce/activity?branchId=b1",
  headers: bearer(tenantTwoAdmin),
});
assert.equal(foreignFeed.statusCode, 200);
assert.deepEqual(foreignFeed.json(), []);
const foreignById = await app.inject({
  method: "GET",
  url: "/workforce/activity/activity-task-http-1-task-http-1:created",
  headers: bearer(tenantTwoAdmin),
});
assert.equal(foreignById.statusCode, 404);
const unknownById = await app.inject({
  method: "GET",
  url: "/workforce/activity/activity-does-not-exist",
  headers: bearer(admin),
});
assert.equal(unknownById.statusCode, 404);

// --- restricted (clinical) activity needs its own authorization ----------------
const adminRestricted = await app.inject({
  method: "GET",
  url: "/workforce/activity?branchId=b1&includeRestricted=true",
  headers: bearer(admin),
});
assert.equal(adminRestricted.statusCode, 403);
assert.equal((adminRestricted.json() as { error: string }).error, "ACTIVITY_RESTRICTED_DENIED");

const clinicianRestricted = await app.inject({
  method: "GET",
  url: "/workforce/activity?branchId=b1&includeRestricted=true",
  headers: bearer(clinician),
});
assert.equal(clinicianRestricted.statusCode, 200);

// A malformed filter is refused rather than silently widened.
const badFilter = await app.inject({
  method: "GET",
  url: "/workforce/activity?branchId=b1&category=clinical_note",
  headers: bearer(frontB1),
});
assert.equal(badFilter.statusCode, 400);
const badActor = await app.inject({
  method: "GET",
  url: "/workforce/activity?branchId=b1&actorKind=clinician",
  headers: bearer(frontB1),
});
assert.equal(badActor.statusCode, 400);

// --- W4 -> C2: verified provider metadata derives operational activity ----------
const webhookPayload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{
    id: "business-1",
    changes: [{
      value: {
        metadata: { phone_number_id: "phone-id-1" },
        contacts: [{ profile: { name: "Sensitive Contact Name" }, wa_id: "966500000001" }],
        messages: [{
          id: "wamid.c2.1",
          from: "966500000001",
          type: "text",
          text: { body: "Sensitive patient-authored content" },
        }],
      },
    }],
  }],
});
const webhook = await app.inject({
  method: "POST",
  url: "/integrations/whatsapp/wa-c2/webhook",
  headers: { "content-type": "application/json", "x-hub-signature-256": sign(webhookPayload) },
  payload: webhookPayload,
});
assert.equal(webhook.statusCode, 202);

// --- C1 -> C2: bounded agent identity activity is derived -----------------------
const registration = await app.inject({
  method: "POST",
  url: "/workforce/agents",
  headers: bearer(admin),
  payload: {
    id: "agent-c2",
    branchId: "b1",
    displayName: "Clinic Ops Assistant",
    kind: "clinic_ops_assistant",
    humanSponsorAccountId: "account-admin",
    effectiveFrom: new Date(NOW_SEC * 1000).toISOString(),
    expiresAt: new Date((NOW_SEC + 30 * 24 * 3600) * 1000).toISOString(),
    credentialRef: "secret://synthetic/agents/agent-c2",
    correlationId: "corr-agent-c2",
  },
});
assert.equal(registration.statusCode, 201);
const capability = await app.inject({
  method: "POST",
  url: "/workforce/agents/agent-c2/capabilities",
  headers: bearer(admin),
  payload: { capability: "workforce.tasks.raise", action: "grant", reason: "synthetic pilot" },
});
assert.equal(capability.statusCode, 200);

const agentFeed = await app.inject({
  method: "GET",
  url: "/workforce/activity?branchId=b1&category=agent_identity",
  headers: bearer(admin),
});
assert.equal(agentFeed.statusCode, 200);
const agentRows = agentFeed.json() as Array<Record<string, unknown>>;
const granted = agentRows.find(
  (row) => row.id === "activity-agent-c2-agent-identity-event-2",
);
assert.ok(granted, "the derived agent capability activity must be readable");
assert.equal(granted.action, "capability_granted");
assert.equal(granted.result, "succeeded");
assert.equal(granted.actorKind, "human");
assert.equal(granted.actorAccountId, "account-admin");
assert.equal(granted.subjectType, "agent_identity");
assert.equal(granted.title, "Agent capability granted");

const communicationFeed = await app.inject({
  method: "GET",
  url: "/workforce/activity",
  headers: bearer(admin),
});
const communicationRows = (communicationFeed.json() as Array<Record<string, unknown>>).filter(
  (row) => row.category === "communication",
);
assert.equal(communicationRows.length, 1);
assert.equal(communicationRows[0].actorKind, "external");
assert.equal(communicationRows[0].sourceDomain, "communications.whatsapp");
assert.equal(communicationRows[0].action, "received");
assert.equal(communicationRows[0].subjectType, "none");
assert.equal(communicationRows[0].subjectRef, null);
const communicationSerialized = JSON.stringify(communicationRows);
assert.ok(!communicationSerialized.includes("966500000001"));
assert.ok(!communicationSerialized.includes("Sensitive"));

// --- replay safety at the HTTP boundary ----------------------------------------
const replay = await app.inject({
  method: "POST",
  url: "/integrations/whatsapp/wa-c2/webhook",
  headers: { "content-type": "application/json", "x-hub-signature-256": sign(webhookPayload) },
  payload: webhookPayload,
});
assert.equal(replay.statusCode, 202);
assert.deepEqual(replay.json(), { accepted: true, events: 1, applied: 0, replayed: 1 });
const afterReplay = await app.inject({
  method: "GET",
  url: "/workforce/activity",
  headers: bearer(admin),
});
assert.equal(
  (afterReplay.json() as Array<Record<string, unknown>>).filter(
    (row) => row.category === "communication",
  ).length,
  1,
  "a replayed provider event must not create a second activity record",
);

// --- the projection path never failed and never fabricated a record -------------
assert.deepEqual(activityProjectionFailures, []);

await app.close();
console.log("N5/C2 activity HTTP smoke passed.");
