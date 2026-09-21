// Zyara Network W4: privacy-first WhatsApp adapter primitives.
//
// Qdrat semantic donor reference:
// TheHalfMoon/Qdrat@e2d288940aab52af881786678b2fc86dfa5c272a.
//
// W4 intentionally does not copy Qdrat/Horilla code. It adapts the useful
// webhook-signature and credential-scoping ideas while keeping all secret
// material outside persistence and all clinical/business actions outside the
// webhook boundary.

export interface WhatsappAccountDescriptor {
  id: string;
  tenantId: string;
  branchId: string;
  businessAccountId: string;
  phoneNumberId: string;
  appSecretRef: string;
  verifyTokenRef: string;
  enabled: boolean;
  sourceRef: string;
  sourceRevision: string;
}

export type WhatsappWebhookEventKind = "message_received" | "delivery_status";

export interface WhatsappWebhookEvent {
  providerEventKey: string;
  kind: WhatsappWebhookEventKind;
  providerMessageRef: string;
  status: string | null;
}

export interface WhatsappWebhookReceipt {
  id: string;
  tenantId: string;
  accountId: string;
  providerEventKey: string;
  kind: WhatsappWebhookEventKind;
  providerMessageRef: string;
  status: string | null;
  payloadDigest: string;
  receivedAt: string;
}

export type WhatsappReceiptResult =
  | { applied: true; receipt: WhatsappWebhookReceipt }
  | { applied: false; receipt: WhatsappWebhookReceipt };

export class WhatsappAdapterError extends Error {
  constructor(
    public readonly code:
      | "WHATSAPP_SIGNATURE_MISSING"
      | "WHATSAPP_SIGNATURE_MALFORMED"
      | "WHATSAPP_SIGNATURE_INVALID"
      | "WHATSAPP_PAYLOAD_INVALID"
      | "WHATSAPP_IDEMPOTENCY_CONFLICT"
      | "WHATSAPP_CONSENT_REQUIRED"
      | "WHATSAPP_DESTINATION_INVALID"
      | "WHATSAPP_TEMPLATE_UNSAFE",
    message: string,
  ) {
    super(message);
  }
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Verify Meta's X-Hub-Signature-256 against the exact raw HTTP body.
 *
 * Re-serialized JSON MUST NOT be used here: a webhook signature authenticates
 * bytes, not semantic JSON. Missing secret/signature fails closed.
 */
export async function verifyMetaWebhookSignature(
  rawBody: Uint8Array,
  signatureHeader: string | undefined,
  appSecret: string | undefined,
): Promise<boolean> {
  if (!appSecret || appSecret.length < 8) return false;
  if (!signatureHeader) return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(signatureHeader.trim());
  if (!match) return false;
  const signature = hexToBytes(match[1]);
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, signature, rawBody);
}

export function verifyMetaChallenge(args: {
  mode: string | undefined;
  suppliedToken: string | undefined;
  expectedToken: string | undefined;
  challenge: string | undefined;
}): string | null {
  if (args.mode !== "subscribe") return null;
  if (!args.expectedToken || !args.suppliedToken || args.suppliedToken !== args.expectedToken) return null;
  if (!args.challenge || args.challenge.length > 512) return null;
  return args.challenge;
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Extract only routing/idempotency metadata after signature verification.
 *
 * Message bodies, contact names, phone numbers, media captions and other
 * patient-authored content are deliberately not returned or persisted by W4.
 * N5+ may introduce a separately governed inbox/content boundary.
 */
export function validateMetaWebhookTarget(
  payload: unknown,
  descriptor: Pick<WhatsappAccountDescriptor, "businessAccountId" | "phoneNumberId">,
): boolean {
  const root = object(payload);
  if (!root || root.object !== "whatsapp_business_account") return false;
  let sawTarget = false;
  for (const entryValue of array(root.entry)) {
    const entry = object(entryValue);
    if (!entry) return false;
    const businessAccountId = text(entry.id);
    if (!businessAccountId || businessAccountId !== descriptor.businessAccountId) return false;
    for (const changeValue of array(entry.changes)) {
      const change = object(changeValue);
      const value = object(change?.value);
      const metadata = object(value?.metadata);
      const phoneNumberId = text(metadata?.phone_number_id);
      if (!phoneNumberId || phoneNumberId !== descriptor.phoneNumberId) return false;
      sawTarget = true;
    }
  }
  return sawTarget;
}

export function extractMetaWebhookEvents(payload: unknown): WhatsappWebhookEvent[] {
  const root = object(payload);
  if (!root || root.object !== "whatsapp_business_account") {
    throw new WhatsappAdapterError("WHATSAPP_PAYLOAD_INVALID", "unsupported WhatsApp webhook object");
  }

  const events: WhatsappWebhookEvent[] = [];
  for (const entryValue of array(root.entry)) {
    const entry = object(entryValue);
    if (!entry) continue;
    for (const changeValue of array(entry.changes)) {
      const change = object(changeValue);
      const value = object(change?.value);
      if (!value) continue;

      for (const messageValue of array(value.messages)) {
        const message = object(messageValue);
        const id = text(message?.id);
        if (!id) continue;
        events.push({
          providerEventKey: `message:${id}`,
          kind: "message_received",
          providerMessageRef: id,
          status: null,
        });
      }

      for (const statusValue of array(value.statuses)) {
        const statusRow = object(statusValue);
        const id = text(statusRow?.id);
        const status = text(statusRow?.status);
        if (!id || !status) continue;
        const timestamp = text(statusRow?.timestamp) ?? "";
        events.push({
          providerEventKey: `status:${id}:${status}:${timestamp}`,
          kind: "delivery_status",
          providerMessageRef: id,
          status,
        });
      }
    }
  }
  return events;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((part) => part.toString(16).padStart(2, "0")).join("");
}

export class WhatsappWebhookReceiptStore {
  private readonly receipts = new Map<string, WhatsappWebhookReceipt>();

  record(receipt: WhatsappWebhookReceipt): WhatsappReceiptResult {
    const scopedKey = `${receipt.tenantId}:${receipt.accountId}:${receipt.providerEventKey}`;
    const existing = this.receipts.get(scopedKey);
    if (existing) {
      const same =
        existing.kind === receipt.kind &&
        existing.providerMessageRef === receipt.providerMessageRef &&
        existing.status === receipt.status;
      if (!same) {
        throw new WhatsappAdapterError(
          "WHATSAPP_IDEMPOTENCY_CONFLICT",
          "provider event key replayed with different authenticated content",
        );
      }
      return { applied: false, receipt: existing };
    }
    const copy = { ...receipt };
    this.receipts.set(scopedKey, copy);
    return { applied: true, receipt: copy };
  }

  list(tenantId: string, accountId: string): WhatsappWebhookReceipt[] {
    return [...this.receipts.values()].filter(
      (receipt) => receipt.tenantId === tenantId && receipt.accountId === accountId,
    );
  }

  clear(): void {
    this.receipts.clear();
  }
}

export interface WhatsappOutboundGateInput {
  destination: string;
  consented: boolean;
  preview: string;
}

/**
 * W4 only qualifies the safety gate. Actual provider sending remains behind a
 * future production credential/provider adapter and authoritative consent
 * resolver. External previews must remain generic and minimally revealing.
 */
export function gateWhatsappOutbound(input: WhatsappOutboundGateInput):
  | { ok: true }
  | { ok: false; code: "WHATSAPP_CONSENT_REQUIRED" | "WHATSAPP_DESTINATION_INVALID" | "WHATSAPP_TEMPLATE_UNSAFE" } {
  if (!input.consented) return { ok: false, code: "WHATSAPP_CONSENT_REQUIRED" };
  if (!/^\+[1-9]\d{7,14}$/.test(input.destination)) {
    return { ok: false, code: "WHATSAPP_DESTINATION_INVALID" };
  }
  const lower = input.preview.toLowerCase();
  for (const token of [
    "diagnosis",
    "prescription",
    "lab result",
    "national id",
    "psych",
    "oncology",
    "cardiology",
    "dermatology",
  ]) {
    if (lower.includes(token)) return { ok: false, code: "WHATSAPP_TEMPLATE_UNSAFE" };
  }
  return { ok: true };
}
