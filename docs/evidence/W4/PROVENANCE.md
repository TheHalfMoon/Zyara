# W4 Provenance — Qdrat WhatsApp Adaptation

## Donor

- Repository: `TheHalfMoon/Qdrat`
- Evaluated revision: `e2d288940aab52af881786678b2fc86dfa5c272a`
- Founder reuse permission: explicitly stated.
- W4 admission mode: **SEMANTIC ADAPTATION / NO DIRECT CODE COPY**.

## Files reviewed

- `whatsapp/views.py`
- `whatsapp/models.py`
- `whatsapp/test_webhook_signature.py`
- related WhatsApp credential migrations discovered in the pinned revision.

## Ideas retained

- Meta webhook challenge verification;
- HMAC-SHA256 verification of `X-Hub-Signature-256`;
- fail-closed behavior when an app secret is missing;
- provider-account/phone-number credential scoping;
- a dedicated WhatsApp integration boundary.

## Ideas changed for Zyara

- secrets are not stored as application-readable database fields;
- only opaque secret-manager references persist;
- the ordinary `zyara_app` role cannot rewrite credential descriptors;
- webhook signatures are verified over exact raw bytes;
- the authenticated payload must also match the configured WABA and
  phone-number ID to prevent cross-account routing when an app secret is shared;
- raw payloads, sender phone numbers, contact names and message bodies are not
  persisted by W4;
- inbound messages do not execute leave, shift, booking, clinical or other
  business actions;
- callback idempotency is keyed by provider event identity rather than raw
  request digest, because providers may rebatch a valid event;
- WhatsApp outbound use requires its own consent and a minimally revealing
  external preview.

## Rejected donor patterns

- rendering/copying access tokens in HTML/clipboard UI;
- revealing webhook tokens on hover;
- using a webhook phone number to directly identify an employee and execute
  workforce actions;
- returning or logging patient-authored message content from the adapter;
- generic background threads as the durable delivery mechanism;
- treating an external webhook as scheduling, clinical or financial authority.

## Security / privacy boundary

W4 is an integration edge, not a care-decision surface. Verified provider
traffic may create metadata receipts only. Content handling and human/agent
collaboration belong to later governed slices.

## Current review-tool limitation

This ChatGPT execution environment exposes GitHub operations but does not expose
the installed local Jev/TypeSafe or Alibaba Open Code Review CLI. No Jev/OCR run
is claimed in this packet. Exact-head CI, source review and repository evidence
must remain distinct from those external reviewer signals. A later environment
with those tools may add review evidence without rewriting this history.
