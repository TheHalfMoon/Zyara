import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { buildServer } from "../src/index.js";
import {
  clearWhatsappRuntimeAccounts,
  installWhatsappRuntimeAccount,
} from "../src/whatsapp.js";

const SECRET = "meta-app-secret-synthetic-only";
const VERIFY = "verify-token";

function sign(body: string, secret = SECRET): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

clearWhatsappRuntimeAccounts();
installWhatsappRuntimeAccount({
  descriptor: {
    id: "wa-1",
    tenantId: "tenant-1",
    branchId: "branch-1",
    businessAccountId: "business-1",
    phoneNumberId: "phone-id-1",
    appSecretRef: "secret://synthetic/whatsapp/app-secret",
    verifyTokenRef: "secret://synthetic/whatsapp/verify-token",
    enabled: true,
    sourceRef: "W4 synthetic HTTP smoke",
    sourceRevision: process.env.ZYARA_BUILD ?? "w4-smoke",
  },
  appSecret: SECRET,
  verifyToken: VERIFY,
});

const app = buildServer();
await app.ready();

const challenge = await app.inject({
  method: "GET",
  url: "/integrations/whatsapp/wa-1/webhook?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=12345",
});
assert.equal(challenge.statusCode, 200);
assert.equal(challenge.body, "12345");

const badChallenge = await app.inject({
  method: "GET",
  url: "/integrations/whatsapp/wa-1/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345",
});
assert.equal(badChallenge.statusCode, 403);

const payload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{
    id: "business-1",
    changes: [{
      value: {
        metadata: { phone_number_id: "phone-id-1" },
        contacts: [{ profile: { name: "Sensitive Name" }, wa_id: "966500000001" }],
        messages: [{
          id: "wamid.http.1",
          from: "966500000001",
          type: "text",
          text: { body: "Sensitive patient-authored content" },
        }],
      },
    }],
  }],
});

const unsigned = await app.inject({
  method: "POST",
  url: "/integrations/whatsapp/wa-1/webhook",
  headers: { "content-type": "application/json" },
  payload,
});
assert.equal(unsigned.statusCode, 403);

const wrong = await app.inject({
  method: "POST",
  url: "/integrations/whatsapp/wa-1/webhook",
  headers: {
    "content-type": "application/json",
    "x-hub-signature-256": sign(payload, "wrong-secret"),
  },
  payload,
});
assert.equal(wrong.statusCode, 403);

const wrongTargetPayload = payload.replace('"phone-id-1"', '"phone-id-2"');
const wrongTarget = await app.inject({
  method: "POST",
  url: "/integrations/whatsapp/wa-1/webhook",
  headers: {
    "content-type": "application/json",
    "x-hub-signature-256": sign(wrongTargetPayload),
  },
  payload: wrongTargetPayload,
});
assert.equal(wrongTarget.statusCode, 403);

const accepted = await app.inject({
  method: "POST",
  url: "/integrations/whatsapp/wa-1/webhook",
  headers: {
    "content-type": "application/json",
    "x-hub-signature-256": sign(payload),
  },
  payload,
});
assert.equal(accepted.statusCode, 202);
assert.deepEqual(accepted.json(), {
  accepted: true,
  events: 1,
  applied: 1,
  replayed: 0,
});

const replay = await app.inject({
  method: "POST",
  url: "/integrations/whatsapp/wa-1/webhook",
  headers: {
    "content-type": "application/json",
    "x-hub-signature-256": sign(payload),
  },
  payload,
});
assert.equal(replay.statusCode, 202);
assert.deepEqual(replay.json(), {
  accepted: true,
  events: 1,
  applied: 0,
  replayed: 1,
});

const tampered = payload.replace("wamid.http.1", "wamid.http.2");
const tamperedResponse = await app.inject({
  method: "POST",
  url: "/integrations/whatsapp/wa-1/webhook",
  headers: {
    "content-type": "application/json",
    "x-hub-signature-256": sign(payload),
  },
  payload: tampered,
});
assert.equal(tamperedResponse.statusCode, 403);

const malformed = "{not-json";
const malformedResponse = await app.inject({
  method: "POST",
  url: "/integrations/whatsapp/wa-1/webhook",
  headers: {
    "content-type": "application/json",
    "x-hub-signature-256": sign(malformed),
  },
  payload: malformed,
});
assert.equal(malformedResponse.statusCode, 400);

await app.close();
console.log("W4 WhatsApp HTTP smoke passed.");
