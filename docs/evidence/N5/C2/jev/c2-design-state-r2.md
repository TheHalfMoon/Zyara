# C2 design state (revision 2) submitted for pre-implementation challenge

Revision 2 answers the round-1 privacy finding (noul 0.35) with a stronger, checkable
invariant. Delta from revision 1 is marked REVISED.

Slice: Zyara Network N5/C2 "Derived Human + Agent Activity". Synthetic/local qualification only.

Pipeline: authoritative domain event -> closed-registry normalization -> derived activity event
(append-only) -> tenant/branch/actor/subject projection -> feed/search/notification input.
No reverse edge exists.

## REVISED: no free text exists anywhere in an activity record

An activity record contains only: closed-enum codes, opaque reference tokens matching
^[A-Za-z0-9_.:-]{1,128}$, timestamps and integers. There is no prose column, no title column,
no note column and no summary prose field.

Human-readable feed titles are DERIVED AT READ TIME from the closed enumerations
(category, action, result, subject_type), never stored. Therefore a caller cannot place
patient text, a clinical narrative, a provider message body, a file name, a free-text reason
or a model explanation into a feed title or a feed row, because no field accepts text with
spaces.

Every text-valued column (subject_ref, actor_ref, source_event_id, source_ref, source_revision,
correlation_id, idempotency key, payload keys and payload values) is validated in the domain
layer and constrained in the database by a token pattern that admits only reference-shaped
values. A value containing whitespace, punctuation outside the reference alphabet, or a
sentence is refused. Arabic or Latin prose cannot be stored.

The optional payload is a flat JSON object whose keys are drawn from a closed allowlist of
operator-context codes (channel, provider, attempt, count, taskKind, previousValue, newValue,
originKind) and whose values are reference tokens or small integers. Total payload size is
bounded, and recordered payload text is additionally refused when it matches credential or
secret patterns (secret://, bearer, api key, access or refresh token, app secret, verify token,
private key, password, credential, authorization header, EAAG prefix, PEM header).

## Storage

New table `activity_events`, tenant and optional branch scoped, forced row level security,
application role privileges exactly SELECT and INSERT (no UPDATE, no DELETE). Columns: id,
tenant_id, branch_id, actor_kind, actor_account_id, actor_agent_id, actor_ref, source_domain,
source_event_id, source_event_version, projection_version, category, action, result,
subject_type, subject_ref, sensitivity, visibility_scope, correlation_id, occurred_at,
recorded_at, payload, supersedes_activity_id, source_ref, source_revision.

Closed registries enforced both in the database as CHECK constraints and in the domain layer:
actor_kind in {human, agent, system, external}; source_domain in {workforce.tasks,
identity.agents, communications.whatsapp}; sensitivity in {operational, restricted};
visibility_scope in {tenant, branch, workflow, private}; category, action, result and
subject_type each closed.

## Actor integrity

human requires a non-null server-authoritative account id; agent requires a non-null
actor_agent_id that is a foreign key into the C1 agent_identities table for the same tenant;
system and external require a namespaced reference token. A free-text actor name can never
satisfy the model.

## Deduplication, correction, authority

Unique on (tenant_id, source_domain, source_event_id, projection_version). A replay returns the
original record; a replay with divergent content raises a conflict error. Correction appends a
superseding record carrying supersedes_activity_id plus a correlation id; history is never
rewritten. Revoked agent activity remains readable and is annotated with the resolved authority
state at projection time, so it never implies a current grant. Activity holds no handle to any
domain store and exposes no write-back path.

## Reads

Operations readers receive sensitivity=operational only, scoped by tenant and branch,
deny-by-default membership with AAL2. sensitivity=restricted is refused to org and branch
administrators who hold no clinical role.

No public HTTP write route exists: a client-declared "authoritative event" would fabricate
source-domain authority.

## Explicit non-goals

No agent credential verification (C1 gap unchanged), no unified inbox, no notification
fan-out, no clinical surface, no search index, no Buzz/Nostr transport, no C3 approval queue,
no C4 audit-chain claim, no PHI, no production readiness.
