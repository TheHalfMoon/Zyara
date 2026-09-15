# DPIA Draft (M003) — NOT an approved assessment

Scope: synthetic-stage patient booking and provider discovery for a bounded
Riyadh/Al Olaya pilot hypothesis. No real data processed.

1. Necessity/proportionality: minimal patient profile (contact + visit facts);
   no national IDs for browsing; purpose-specific sharing; see inventory.
2. Risks: cross-tenant leakage (mitigated M002 RLS+guards); re-identification
   via reviews (mitigated: verified-visit eligibility, anonymity, moderation);
   over-collection via intake (mitigated: material-fields-only rule, M013).
3. Consultation: clinical intended-use review PENDING; counsel review PENDING.
4. Residual: ALL mitigations above are synthetic-stage; real-patient processing
   requires signed DPIA before M029. Recorded as launch blockers, not conclusions.
