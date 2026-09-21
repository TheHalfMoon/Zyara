// W4 external WhatsApp webhook edge.
//
// This boundary verifies Meta signatures over the exact raw request bytes and
// persists/returns metadata-only receipts. It does NOT execute clinic, clinical,
// scheduling, insurance or financial actions. Message bodies and sender phone
// numbers are deliberately discarded in W4.
import type { FastifyInstance } from "fastify";
import {
  WhatsappWebhookReceiptStore,
  extractMetaWebhookEvents,
  sha256Hex,
  validateMetaWebhookTarget,
  verifyMetaChallenge,
  verifyMetaWebhookSignature,
  type WhatsappAccountDescriptor,
  type WhatsappWebhookReceipt,
} from "@zyara/communication";
import { projectWhatsappReceiptActivity } from "./activity.js";

interface RuntimeWhatsappAccount {
  descriptor: WhatsappAccountDescriptor;
  appSecret: string;
  verifyToken: string;
}

// Synthetic/local runtime registry only. Production must populate equivalent
// values from an approved secret manager. There is intentionally no HTTP route
// that creates, reads or exports these secrets.
const RUNTIME_ACCOUNTS = new Map<string, RuntimeWhatsappAccount>();
export const whatsappReceiptStore = new WhatsappWebhookReceiptStore();

export function installWhatsappRuntimeAccount(account: RuntimeWhatsappAccount): void {
  if (!account.descriptor.id || !account.appSecret || !account.verifyToken) {
    throw new Error("WHATSAPP_RUNTIME_CREDENTIAL_MALFORMED");
  }
  RUNTIME_ACCOUNTS.set(account.descriptor.id, {
    descriptor: { ...account.descriptor },
    appSecret: account.appSecret,
    verifyToken: account.verifyToken,
  });
}

export function clearWhatsappRuntimeAccounts(): void {
  RUNTIME_ACCOUNTS.clear();
  whatsappReceiptStore.clear();
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function registerWhatsAppRoutes(app: FastifyInstance) {
  void app.register(async (scope) => {
    // Meta signs the exact HTTP bytes. The normal Fastify JSON parser discards
    // that representation, so the webhook scope owns a raw-buffer parser and
    // parses JSON only after signature verification.
    scope.removeContentTypeParser("application/json");
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "buffer", bodyLimit: 1_048_576 },
      (_request, body, done) => done(null, body),
    );

    scope.get("/integrations/whatsapp/:accountId/webhook", async (req, reply) => {
      const params = (req.params ?? {}) as { accountId?: string };
      const query = (req.query ?? {}) as Record<string, string | undefined>;
      const runtime = params.accountId ? RUNTIME_ACCOUNTS.get(params.accountId) : undefined;
      if (!runtime || !runtime.descriptor.enabled) {
        return reply.code(403).send({ error: "WHATSAPP_WEBHOOK_FORBIDDEN" });
      }
      const challenge = verifyMetaChallenge({
        mode: query["hub.mode"],
        suppliedToken: query["hub.verify_token"],
        expectedToken: runtime.verifyToken,
        challenge: query["hub.challenge"],
      });
      if (challenge === null) {
        return reply.code(403).send({ error: "WHATSAPP_WEBHOOK_FORBIDDEN" });
      }
      return reply.type("text/plain").send(challenge);
    });

    scope.post("/integrations/whatsapp/:accountId/webhook", async (req, reply) => {
      const params = (req.params ?? {}) as { accountId?: string };
      const runtime = params.accountId ? RUNTIME_ACCOUNTS.get(params.accountId) : undefined;
      if (!runtime || !runtime.descriptor.enabled) {
        return reply.code(403).send({ error: "WHATSAPP_WEBHOOK_FORBIDDEN" });
      }
      if (!Buffer.isBuffer(req.body)) {
        return reply.code(400).send({ error: "WHATSAPP_RAW_BODY_REQUIRED" });
      }
      const rawBody = req.body;
      const signature = headerValue(req.headers["x-hub-signature-256"]);
      const valid = await verifyMetaWebhookSignature(rawBody, signature, runtime.appSecret);
      if (!valid) {
        return reply.code(403).send({ error: "WHATSAPP_SIGNATURE_INVALID" });
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return reply.code(400).send({ error: "WHATSAPP_PAYLOAD_INVALID" });
      }

      if (!validateMetaWebhookTarget(payload, runtime.descriptor)) {
        return reply.code(403).send({ error: "WHATSAPP_TARGET_MISMATCH" });
      }

      let events;
      try {
        events = extractMetaWebhookEvents(payload);
      } catch {
        return reply.code(400).send({ error: "WHATSAPP_PAYLOAD_INVALID" });
      }

      const digest = await sha256Hex(rawBody);
      let applied = 0;
      let replayed = 0;
      const receipts: WhatsappWebhookReceipt[] = [];
      for (const event of events) {
        try {
          const result = whatsappReceiptStore.record({
            id: `${runtime.descriptor.id}:${event.providerEventKey}`,
            tenantId: runtime.descriptor.tenantId,
            accountId: runtime.descriptor.id,
            providerEventKey: event.providerEventKey,
            kind: event.kind,
            providerMessageRef: event.providerMessageRef,
            status: event.status,
            payloadDigest: digest,
            receivedAt: new Date().toISOString(),
          });
          if (result.applied) applied += 1;
          else replayed += 1;
          receipts.push(result.receipt);
        } catch {
          // Same provider event key with different authenticated bytes is not
          // silently accepted: preserve evidence and force manual inspection.
          return reply.code(409).send({ error: "WHATSAPP_IDEMPOTENCY_CONFLICT" });
        }
      }

      // C2: verified provider metadata becomes derived operational activity. Only the
      // provider event kind is projected, never a phone number, contact name or message
      // body, and a replay is deduplicated by source event id. Projection runs after the
      // authoritative receipt is committed and never fails the webhook response.
      for (const receipt of receipts) {
        await projectWhatsappReceiptActivity(
          runtime.descriptor.tenantId,
          runtime.descriptor.id,
          receipt,
        );
      }

      return reply.code(202).send({
        accepted: true,
        events: events.length,
        applied,
        replayed,
      });
    });
  });
}
