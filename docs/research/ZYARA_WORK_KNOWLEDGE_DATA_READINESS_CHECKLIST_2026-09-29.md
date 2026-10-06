# Zyara Work / Knowledge / Data Plane — Readiness Checklist

**Date:** 2026-09-29  
**Planning base:** `56eb66d8b828b4d9412047c1cd64dec0c64b7d76`

Purpose: prevent the WKD amendment from being called implementation-ready while a known architecture concern is absent.

Legend:

- `COVERED` — explicit contract/boundary/gate exists in the plan/handoff.
- `EXTERNAL_GATE` — architecture is defined but real authority/evidence is external.
- `DEFERRED_BY_DESIGN` — not required for first implementation leaf.

| # | Dimension | State | Owner / evidence |
|---:|---|---|---|
| 1 | Healthcare domain truth remains outside donor platforms | COVERED | canonical §§1-2 |
| 2 | N5 remains agent approval/audit authority | COVERED | §§1-2 |
| 3 | W3 remains human operational-task authority | COVERED | §§7-9 |
| 4 | AIF remains capability/privacy/runtime authority | COVERED | §§1-2 |
| 5 | Agent org chart cannot grant authority | COVERED | §2/§4.2 |
| 6 | Work ownership != permission | COVERED | §2/§7 |
| 7 | Model availability != model admission | COVERED | §2/§5 |
| 8 | Planner node != capability grant | COVERED | §2/§6 |
| 9 | Analytics result != clinical record | COVERED | §2/§17 |
| 10 | Source pins exact | COVERED | §3/source adoption |
| 11 | Founder copy/use authorization recorded | COVERED | §3/source adoption |
| 12 | DBX license identified | COVERED | source adoption §2 |
| 13 | Paperclip license identified | COVERED | source adoption §3 |
| 14 | Synaplan license identified | COVERED | source adoption §4 |
| 15 | Path-level provenance required before copy | COVERED | source adoption §1 |
| 16 | Third-party dependency/data/model terms separate | COVERED | source adoption §1 |
| 17 | No whole-platform stacking | COVERED | source adoption §6 |
| 18 | Donor update/rollback strategy required | COVERED | source adoption §1 |
| 19 | Configured vs healthy provider separated | COVERED | canonical §5 |
| 20 | Healthy vs admitted provider separated | COVERED | §5 |
| 21 | Credential presence separated from validation | COVERED | §5 |
| 22 | Local model artifact presence modeled | COVERED | §5 |
| 23 | Provider readiness has observed-at/freshness | COVERED | §5 |
| 24 | Stale health != healthy | COVERED | §5 |
| 25 | Read path cannot mutate provider config | COVERED | §5 |
| 26 | Auto-repair is separate audited command | COVERED | §5 |
| 27 | Provider config change invalidates readiness cache | COVERED | §5 |
| 28 | Historical receipts survive provider removal | COVERED | §5 |
| 29 | Local-only provider unavailable fails closed | COVERED | §5/§16 |
| 30 | Module inventory is per install/user/tenant context | COVERED | §5.2 |
| 31 | Module id/version/digest stable | COVERED | §13 |
| 32 | Duplicate module ids rejected | COVERED | §13 |
| 33 | Module descriptor construction has no remote side effect | COVERED | §13 |
| 34 | Module capability declaration != caller grant | COVERED | §13 |
| 35 | Module disable withdraws new capability use | COVERED | §13 |
| 36 | Historical module receipt remains interpretable | COVERED | §13 |
| 37 | Optional absent feature does not leave dead UI | COVERED | §13 |
| 38 | PlanGraph separated from OperationSpec DAG | COVERED | §6 |
| 39 | PlanGraph schema versioned | COVERED | §6 |
| 40 | Planner model/profile version retained | COVERED | §6 |
| 41 | Unknown capability rejected | COVERED | §6.3 |
| 42 | Ungranted capability rejected | COVERED | §6.3 |
| 43 | Duplicate plan node rejected | COVERED | §6.3 |
| 44 | Self-dependency rejected | COVERED | §6.3 |
| 45 | Unknown dependency rejected | COVERED | §6.3 |
| 46 | Plan cycles rejected | COVERED | §6.3 |
| 47 | Plan node count bounded | COVERED | §6.3 |
| 48 | Plan depth/fan-out bounded | COVERED | §6.3 |
| 49 | Reply-node validation | COVERED | §6.3 |
| 50 | Raw secret refs rejected in plan | COVERED | §6.3 |
| 51 | Provider/model override is advisory only | COVERED | §6.4 |
| 52 | Human-only actions cannot compile to auto execution | COVERED | §6.3-6.4 |
| 53 | Identity/grants re-resolved at compile | COVERED | §6.4 |
| 54 | Purpose/consent re-resolved at compile | COVERED | §6.4 |
| 55 | Approval re-resolved at compile | COVERED | §6.4 |
| 56 | Provider readiness re-resolved at compile | COVERED | §6.4 |
| 57 | Budget re-resolved at compile | COVERED | §6.4 |
| 58 | Safe fallback is task-contract-specific | COVERED | §6.5 |
| 59 | Protected plan failure cannot silently generic-fallback | COVERED | §6.5 |
| 60 | Work hierarchy separated from dependency | COVERED | §7 |
| 61 | Work dependency separated from ownership | COVERED | §7 |
| 62 | Work ownership separated from execution | COVERED | §7 |
| 63 | AutomationWorkItem linked to authoritative source | COVERED | §8 |
| 64 | No duplicate human helpdesk system | COVERED | §8 |
| 65 | Agent in-progress requires live/recoverable execution | COVERED | §9 |
| 66 | Human in-progress does not imply heartbeat | COVERED | §9 |
| 67 | Blocked state requires routable path | COVERED | §9 |
| 68 | Prose-only blocked rejected | COVERED | §9 |
| 69 | Cancelled blocker does not auto-satisfy dependency | COVERED | §9 |
| 70 | Terminal work history not silently rewritten | COVERED | §9 |
| 71 | Atomic agent work claim | COVERED | handoff WKD-03B |
| 72 | Stale claim compare-and-clear | COVERED | §9/handoff |
| 73 | Old run cannot clear successor claim | COVERED | §9/handoff |
| 74 | Live claim conflict is not blind retry loop | COVERED | §9/handoff |
| 75 | Pre-dispatch agent identity check | COVERED | §10 |
| 76 | Pre-dispatch sponsor check | COVERED | §10 |
| 77 | Pre-dispatch capability/approval check | COVERED | §10 |
| 78 | Pre-dispatch credential/config check | COVERED | §10 |
| 79 | Pre-dispatch provider/module health check | COVERED | §10 |
| 80 | Pre-dispatch blockers/budget/privacy check | COVERED | §10 |
| 81 | Configuration-incomplete != runtime failure | COVERED | §10 |
| 82 | Durable InteractionRequest object | COVERED | §11 |
| 83 | Question/confirmation/approval/permission distinguished | COVERED | §11 |
| 84 | Interaction addressee explicit | COVERED | §11 |
| 85 | Interaction expiry explicit | COVERED | §11 |
| 86 | Interaction parameter digest available | COVERED | §11 |
| 87 | Settlement durable before continuation | COVERED | §11.3 |
| 88 | Duplicate interaction answer handled | COVERED | §11.3 |
| 89 | Stale/superseded answer rejected | COVERED | §11.3 |
| 90 | Failed publication != delivered interaction | COVERED | §11.3 |
| 91 | External channel projection minimized | COVERED | §11.3 |
| 92 | Protected approval remains in governed UI when needed | COVERED | §11.3 |
| 93 | Opaque short-lived callback token | COVERED | §11.3 |
| 94 | Callback payload excludes PHI/canonical authority ids | COVERED | §11.3 |
| 95 | Routine trigger instance durable/idempotent | COVERED | §12 |
| 96 | Schedule timezone explicit | COVERED | §12 |
| 97 | Catch-up policy explicit | COVERED | §12 |
| 98 | Concurrency policy explicit | COVERED | §12 |
| 99 | Missed schedule cannot blindly replay time-sensitive action | COVERED | §12 |
| 100 | Routine disable audited/effective for new work | COVERED | §12 |
| 101 | Actual send-time consent/channel recheck | COVERED | §12 |
| 102 | Budget warn/hard stop modeled | COVERED | §22 |
| 103 | Budget race tested | COVERED | handoff WKD-05B |
| 104 | Safety/reconciliation reserve can exist | COVERED | §22 |
| 105 | Budget hard stop does not abandon UNKNOWN side effect | COVERED | §22 |
| 106 | Cost optimization never outranks safety | COVERED | §22 |
| 107 | Module protocol version explicit | COVERED | §14 |
| 108 | Sidecar module id/version match descriptor | COVERED | §14 |
| 109 | Sidecar cancellation/timeout | COVERED | §14 |
| 110 | Sidecar connect/disconnect idempotent | COVERED | §14 |
| 111 | Sidecar secrets host-resolved | COVERED | §14 |
| 112 | Secrets excluded from sidecar events/errors | COVERED | §14 |
| 113 | Sidecar data dir not treated as secret store | COVERED | §14 |
| 114 | Package traversal/symlink rejected | COVERED | §14 |
| 115 | Package digest/signature verified | COVERED | §14 |
| 116 | Unsigned dev packages cannot become prod-admitted accidentally | COVERED | §14 |
| 117 | Native sidecar not treated as OS sandbox | COVERED | §14 |
| 118 | Knowledge source binding scoped | COVERED | §15 |
| 119 | Source ACL checked before ingestion/disclosure | COVERED | §15 |
| 120 | Knowledge sync cursor/checkpoint durable | COVERED | §15 |
| 121 | Knowledge upsert idempotent | COVERED | §15 |
| 122 | Source deletion/tombstone propagates | COVERED | §15 |
| 123 | Source revoke/disconnect propagates | COVERED | §15 |
| 124 | Chunk/document provenance retained | COVERED | §15 |
| 125 | Connector freshness visible | COVERED | §15 |
| 126 | Connector failure does not masquerade stale data as current | COVERED | §15 |
| 127 | Content scan/type/size gate | COVERED | §15 |
| 128 | Prompt injection treated as untrusted source content | COVERED | §15 |
| 129 | Embedding/index is rebuildable projection | COVERED | §15 |
| 130 | No cross-tenant PHI semantic index | COVERED | §15 |
| 131 | Air-gapped provider readiness works without cloud | COVERED | §16 |
| 132 | No mandatory cloud telemetry in private profile | COVERED | §16 |
| 133 | Local model artifact provenance | COVERED | §16 + AIF |
| 134 | Local failure does not silently egress PHI | COVERED | §16 |
| 135 | Data access tiers explicit | COVERED | §17.1 |
| 136 | Ordinary AI defaults to T0-T2 | COVERED | §17.1 |
| 137 | Direct operational DB SQL is reject-default | COVERED | §17.1 |
| 138 | DataAccessGrant separate from model/tool grant | COVERED | §17.2 |
| 139 | Data grant tenant/branch scope | COVERED | §17.2 |
| 140 | Data grant purpose/expiry | COVERED | §17.2 |
| 141 | Data grant max rows/runtime/export | COVERED | §17.2 |
| 142 | Typed metric/filter DSL is default AI query path | COVERED | §17.3 |
| 143 | Model cannot choose raw connection id | COVERED | §17.3 |
| 144 | Human raw SQL is optional separate qualification | COVERED | §17.4 |
| 145 | Raw SQL uses dedicated read-only role | COVERED | §17.4 |
| 146 | Raw SQL targets analytics/read replica/curated schema | COVERED | §17.4 |
| 147 | Exactly one SQL statement | COVERED | §17.4 |
| 148 | SQL write/DDL/session switch/locking denied | COVERED | §17.4 |
| 149 | Unsafe SQL functions/extensions controlled | COVERED | §17.4 |
| 150 | SQL max rows/runtime/resource limits | COVERED | §17.4 |
| 151 | SQL preview/audit/export audit | COVERED | §17.4 |
| 152 | SQL classifier is defense-in-depth only | COVERED | §17.4 |
| 153 | Generic execute_sql not exposed to care agents | COVERED | §17.5 |
| 154 | AI/MCP tools inherit AIF identity/capability checks | COVERED | §17.5 |
| 155 | AI/MCP results bounded and untrusted | COVERED | §17.5 |
| 156 | Schema browser limited to approved data surfaces | COVERED | §18 |
| 157 | Metric/data lineage modeled | COVERED | §18 |
| 158 | Schema/data workspace is admin/engineering, not patient UI | COVERED | §18 |
| 159 | Action Center shows work/owner/run/blocker | COVERED | §19 |
| 160 | Action Center shows interaction/approval | COVERED | §19 |
| 161 | Action Center shows plan/receipts/provider/module | COVERED | §19 |
| 162 | Action Center shows budget/reconciliation/evidence | COVERED | §19 |
| 163 | Agent role display not healthcare authority | COVERED | §19 |
| 164 | WorkProduct has run/source provenance | COVERED | §20 |
| 165 | Generated draft != signed clinical record | COVERED | §20 |
| 166 | WorkProduct data classification/retention | COVERED | §20 |
| 167 | SkillBundle version/digest/governance | COVERED | §21 |
| 168 | Skill cannot widen capability/egress | COVERED | §21 |
| 169 | Untrusted content cannot become system skill | COVERED | §21 |
| 170 | Skill revocation blocks new runs | COVERED | §21 |
| 171 | Cost accounting multidimensional | COVERED | §22 |
| 172 | Planner ungranted-capability threat test | COVERED | §23 |
| 173 | Planner graph-explosion threat test | COVERED | §23 |
| 174 | Stale provider inventory threat test | COVERED | §23 |
| 175 | Plugin permission mismatch threat test | COVERED | §23 |
| 176 | Fake read-only hint threat test | COVERED | §23 |
| 177 | SQL smuggling/bypass/DoS threat tests | COVERED | §23 |
| 178 | Cross-tenant analytics threat test | COVERED | §23 |
| 179 | External callback replay threat test | COVERED | §23 |
| 180 | Duplicate routine/catch-up storm tests | COVERED | §23 |
| 181 | Prompt injection in connector/RAG threat test | COVERED | §23 |
| 182 | Work-product truth-promotion threat test | COVERED | §23 |
| 183 | PHI-light readiness/module health logs | COVERED | §24 |
| 184 | Query history retention explicit | COVERED | §24 |
| 185 | Connector disconnect retention/deletion evaluation | COVERED | §24 |
| 186 | Cost records exclude raw prompt/document by default | COVERED | §24 |
| 187 | Work claim/checkout recovery explicit | COVERED | §25 |
| 188 | Interaction settlement restart-safe | COVERED | §25 |
| 189 | Query cancel/timeout server-enforced | COVERED | §25 |
| 190 | Connector resume from durable cursor | COVERED | §25 |
| 191 | Failure preserves evidence/no fake completion | COVERED | §25 |
| 192 | Additive data-model delta defined | COVERED | §26 |
| 193 | Existing approvals/audit/identities reused | COVERED | §26 |
| 194 | WKD implementation slices dependency-ordered, including explicit AIF prerequisite edges (AIF-02, 03A, 03D, 04A, 04B, 04C, 07, 08) | COVERED | §§27-28; handoff §2 |
| 195 | First WKD leaf bounded/no PHI/no credentials | COVERED | §29 |
| 196 | Production provider credentials | EXTERNAL_GATE | §30 |
| 197 | Production PHI model/provider approval | EXTERNAL_GATE | §30 |
| 198 | Real clinic connector authorization | EXTERNAL_GATE | §30 |
| 199 | External automation rights | EXTERNAL_GATE | §30 |
| 200 | Production BI/data-export approval | EXTERNAL_GATE | §30 |
| 201 | Real Action Center user validation | EXTERNAL_GATE | §30 |
| 202 | Legal/privacy approval for production analytics datasets | EXTERNAL_GATE | §30 |
| 203 | On-prem/enterprise infrastructure evidence | EXTERNAL_GATE | §30 |
| 204 | Clinical governance for clinical-authority workflows | EXTERNAL_GATE | §30 |

## Verdict

No currently known architecture gap introduced by DBX, Paperclip, or Synaplan blocks bounded implementation.

External evidence/authority gates remain deliberately separate from repository implementation and must not be reported as complete.

The first WKD-specific leaf is `WKD-01A`, after canonical AIF-01A/AIF-01B.

`ZYARA_WORK_KNOWLEDGE_DATA_GAP_REVIEW = PASS_FOR_BOUNDED_IMPLEMENTATION`
