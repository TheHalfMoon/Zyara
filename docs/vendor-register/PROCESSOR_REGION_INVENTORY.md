# Processor / Region Inventory (M003)

| Processor/service | Purpose | Region | Status |
|---|---|---|---|
| Self-hosted PostgreSQL/PostGIS (dev) | Synthetic ledger | Local only | OK (synthetic) |
| GitHub Actions | CI | US/EU (vendor default) | OK — no PHI in CI |
| Synthetic Keycloak realm | Local auth | Local only | OK (synthetic) |
| SMS/email sender (live) | Notifications | TBD | BLOCKED: no vendor selected, no DPA |
| Cloud ASR (optional, future) | Voice input | TBD | BLOCKED: approved-adapter + privacy review required |
| Production hosting | Pilot | TBD (Saudi preferred) | BLOCKED: no hosting decision/DPA |

No transfer exemption claimed. No production data with any processor today.
