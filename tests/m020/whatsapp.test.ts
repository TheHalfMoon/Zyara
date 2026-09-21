// W4 WhatsApp adapter qualification.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  WhatsappAdapterError,
  WhatsappWebhookReceiptStore,
  extractMetaWebhookEvents,
  gateWhatsappOutbound,
  sha256Hex,
  verifyMetaChallenge,
  verifyMetaWebhookSignature,
} from "@zyara/communication";

const SECRET = "meta-app-secret-synthetic-only";
const rawPayload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{
    changes: [{
      value: {
        contacts: [{ profile: { name: "Sensitive Patient Name" }, wa_id: "966500000001" }],
        messages: [{
          id: "wamid.1",
          from: "966500000001",
          type: "text",
          text: { body: "Sensitive free-text medical detail" },
        }],
      },
    }],
  }],
});

async function signature(body: string, secret = SECRET): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );
  return "sha256=" + [...bytes].map((part) => part.toString(16).padStart(2, "0")).join("");
}

describe("W4 WhatsApp adapter", () => {
  it("verifies Meta HMAC over exact raw bytes and rejects missing/wrong/tampered input", async () => {
    const sig = await signature(rawPayload);
    const raw = new TextEncoder().encode(rawPayload);
    assert.equal(await verifyMetaWebhookSignature(raw, sig, SECRET), true);
    assert.equal(await verifyMetaWebhookSignature(raw, undefined, SECRET), false);
    assert.equal(await verifyMetaWebhookSignature(raw, "sha256=bad", SECRET), false);
    assert.equal(await verifyMetaWebhookSignature(raw, await signature(rawPayload, "wrong-secret"), SECRET), false);

    const tampered = new TextEncoder().encode(rawPayload.replace("wamid.1", "wamid.2"));
    assert.equal(await verifyMetaWebhookSignature(tampered, sig, SECRET), false);
  });

  it("verifies subscription challenge only for the exact server-side token", () => {
    assert.equal(verifyMetaChallenge({
      mode: "subscribe",
      suppliedToken: "verify-token",
      expectedToken: "verify-token",
      challenge: "12345",
    }), "12345");
    assert.equal(verifyMetaChallenge({
      mode: "subscribe",
      suppliedToken: "wrong",
      expectedToken: "verify-token",
      challenge: "12345",
    }), null);
  });

  it("extracts metadata-only inbound events and drops message content/contact identity", () => {
    const events = extractMetaWebhookEvents(JSON.parse(rawPayload));
    assert.deepEqual(events, [{
      providerEventKey: "message:wamid.1",
      kind: "message_received",
      providerMessageRef: "wamid.1",
      status: null,
    }]);
    const serialized = JSON.stringify(events);
    assert.equal(serialized.includes("Sensitive Patient Name"), false);
    assert.equal(serialized.includes("Sensitive free-text medical detail"), false);
    assert.equal(serialized.includes("966500000001"), false);
  });

  it("extracts delivery status metadata without message content", () => {
    const events = extractMetaWebhookEvents({
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            statuses: [{ id: "wamid.2", status: "delivered", timestamp: "1790000000" }],
          },
        }],
      }],
    });
    assert.deepEqual(events, [{
      providerEventKey: "status:wamid.2:delivered:1790000000",
      kind: "delivery_status",
      providerMessageRef: "wamid.2",
      status: "delivered",
    }]);
  });

  it("deduplicates identical authenticated callbacks and rejects conflicting replay", async () => {
    const store = new WhatsappWebhookReceiptStore();
    const digest = await sha256Hex(new TextEncoder().encode(rawPayload));
    const receipt = {
      id: "receipt-1",
      tenantId: "t1",
      accountId: "wa-1",
      providerEventKey: "message:wamid.1",
      kind: "message_received" as const,
      providerMessageRef: "wamid.1",
      status: null,
      payloadDigest: digest,
      receivedAt: "2026-09-21T16:00:00Z",
    };
    assert.equal(store.record(receipt).applied, true);
    assert.equal(store.record({ ...receipt, receivedAt: "2026-09-21T16:00:01Z" }).applied, false);
    assert.throws(
      () => store.record({ ...receipt, payloadDigest: "0".repeat(64) }),
      (error: unknown) =>
        error instanceof WhatsappAdapterError &&
        error.code === "WHATSAPP_IDEMPOTENCY_CONFLICT",
    );
  });

  it("requires explicit WhatsApp consent, E.164 destination and generic external preview", () => {
    const safe = "Reminder: you have an upcoming appointment. Sign in to view details.";
    assert.deepEqual(gateWhatsappOutbound({
      destination: "+966500000001",
      consented: true,
      preview: safe,
    }), { ok: true });
    assert.deepEqual(gateWhatsappOutbound({
      destination: "+966500000001",
      consented: false,
      preview: safe,
    }), { ok: false, code: "WHATSAPP_CONSENT_REQUIRED" });
    assert.deepEqual(gateWhatsappOutbound({
      destination: "0500000001",
      consented: true,
      preview: safe,
    }), { ok: false, code: "WHATSAPP_DESTINATION_INVALID" });
    assert.deepEqual(gateWhatsappOutbound({
      destination: "+966500000001",
      consented: true,
      preview: "Your cardiology diagnosis is ready.",
    }), { ok: false, code: "WHATSAPP_TEMPLATE_UNSAFE" });
  });

  it("migration stores only secret references, enforces RLS and keeps webhook receipts append-only", () => {
    const sql = readFileSync(new URL("../../db/migrations/041_whatsapp_adapter.sql", import.meta.url), "utf8");
    for (const token of [
      "whatsapp_accounts",
      "whatsapp_outbound_operations",
      "whatsapp_webhook_receipts",
      "app_secret_ref",
      "verify_token_ref",
      "FORCE ROW LEVEL SECURITY",
      "WITH CHECK",
      "GRANT SELECT, INSERT ON whatsapp_webhook_receipts",
    ]) {
      assert.ok(sql.includes(token), token);
    }
    for (const forbidden of [
      "meta_token TEXT",
      "app_secret TEXT",
      "verify_token TEXT",
      "message_body",
      "sender_phone",
      "contact_name",
    ]) {
      assert.equal(sql.includes(forbidden), false, forbidden);
    }
  });
});
