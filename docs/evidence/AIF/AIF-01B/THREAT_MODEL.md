# AIF-01B Threat Model (delta)

Added in the AIF-01 closure (AIF handoff §15). Scope: the resolver decision point and migration 046.

| Threat | Mitigation | Proof |
| --- | --- | --- |
| A caller chooses the tenant or actor | the principal is server-derived; a body tenant is only compared; inputs are snapshotted once | body-tenant, unknown-kind and getter tests |
| A failing dependency yields ALLOW | every port failure or exception is UNDECIDABLE | the UNDECIDABLE suite (every port, the clock) |
| Approval replay or theft | the approval is bound to its requester and to one invocation identity (actor + key); a claim table with a race-safe PK; a DB guard (approved, live, same tenant, `FOR SHARE`, pinned `search_path`); a receipt-to-claim FK | claim, race, requester and NOT_APPLICABLE tests; DB smoke |
| A low-risk call consumes someone else's approval | an approval is refused where not required and echoed only when used | NOT_APPLICABLE test |
| An agent or workflow gains A5 | refused in code and by a DB CHECK plus a composite FK on authority class | A5 tests; DB smoke |
| An admin acts clinically | admin roles are kept out of clinical-signing data, PHI writes and non-approval-gated PHI reads, including tenant-wide | fix-cycle 2/3 tests |
| A forged or edited receipt | shape validation plus a content-digest check before recording; DB shape CHECKs | forged and tampered receipt tests; DB smoke |
| Backdated or future-dated grants | column-level INSERT; database `now()` timestamps | DB smoke (`granted_at`, `revoked_at`) |
| Free text, PHI or secrets in receipts | only opaque shapes are echoed; TS/SQL token parity over shared fixtures | leak test; parity fixtures in unit tests and smoke |
| Time-of-check vs time-of-use | ALLOW is valid for 60 s; dispatch re-resolves (AIF-04C); an expired ALLOW is not recorded | expiry test |

Residuals:

- Receipts are not yet authenticated (AIF-02 MAC).
- Workflow confused deputy (AIF-04).
- `granted_by` admin authenticity sits at the application layer.
