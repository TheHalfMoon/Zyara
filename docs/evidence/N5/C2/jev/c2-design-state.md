# C2 design state submitted for pre-implementation challenge

Slice: Zyara Network N5/C2 "Derived Human + Agent Activity". Synthetic/local qualification only.

Pipeline: authoritative domain event -> closed-registry normalization -> derived activity event
(append-only) -> tenant/branch/actor/subject projection -> feed/search/notification input.
No reverse edge exists.

Storage: new table `activity_events`, tenant + optional branch scoped, forced row level
security, application role privileges exactly SELECT and INSERT (no UPDATE, no DELETE).
Columns: id, tenant_id, branch_id, actor_kind, actor_account_id, actor_agent_id, actor_ref,
source_domain, source_event_id, source_event_version, projection_version, category, action,
result, subject_type, subject_ref, sensitivity, visibility_scope, correlation_id,
occurred_at, recorded_at, payload, supersedes_activity_id, source_ref, source_revision.

Closed registries enforced in the database as CHECK constraints and in the domain layer:
actor_kind in {human, agent, system, external}; source_domain in {workforce.tasks,
identity.agents, communications.whatsapp}; category, action, result, subject_type,
sensitivity in {operational, restricted}; visibility_scope in {tenant, branch, workflow,
private}.

Actor integrity: human requires a non-null server-authoritative account id; agent requires a
non-null actor_agent_id that is a foreign key into the C1 `agent_identities` table for the
same tenant; system and external require a namespaced actor_ref. A free-text actor name can
never satisfy the model.

Payload privacy: payload must be a flat JSON object whose keys are drawn from a closed
allowlist (summary, subjectLabel, channel, provider, attempt, reason, count, taskKind,
previousValue, newValue); every value is a bounded string; total payload text is capped; and
the text is refused when it matches credential or secret patterns (secret://, bearer, api key,
access/refresh token, app secret, verify token, private key, password, credential,
authorization header, EAAG prefix, PEM header) or clinical-content markers.

Deduplication: unique on (tenant_id, source_domain, source_event_id, projection_version). A
replay returns the original record; a replay with divergent content raises a conflict error.

Correction: append a superseding record carrying supersedes_activity_id plus a correlation id;
history is never rewritten. Revoked agent activity remains readable and is annotated with the
resolved authority state at projection time, so it never implies a current grant.

Reads: operations readers receive sensitivity=operational only, scoped by tenant and branch,
deny-by-default membership with AAL2. sensitivity=restricted is refused to org/branch
administrators who hold no clinical role.

No public HTTP write route exists: a client-declared "authoritative event" would fabricate
source-domain authority.

Explicit non-goals: no agent credential verification (C1 gap unchanged), no unified inbox, no
notification fan-out, no clinical surface, no search index, no Buzz/Nostr transport, no C3
approval queue, no C4 audit-chain claim, no PHI, no production readiness.
