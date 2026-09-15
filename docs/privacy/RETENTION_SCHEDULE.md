# Retention Schedule (M003) — PROPOSED, counsel to confirm

| Dataset | Proposed retention | Erasure route |
|---|---|---|
| Account identity | Lifetime + 30 days | Self-service delete + revoke sessions |
| Patient profile/visits | Visit + 6 years (PROPOSED) | Request workflow; legal-hold override logged |
| Appointment ledger | Visit + 6 years (PROPOSED) | Same as above |
| Provider public graph | Until withdrawn; history preserved | Withdrawal/supersession, never destructive merge |
| Audit events | 1 year rolling (PROPOSED) | Automatic expiry; legal-hold override logged |
| Notification prefs | Until withdrawn + 90 days | Preference center + quiet-hours respected |
| Redacted telemetry | 90 days aggregated (PROPOSED) | Automatic expiry |

No retention timer runs against real data today: environments are synthetic-only.
