# C2 design state (revision 3) submitted for pre-implementation challenge

Revision 3 answers the round-1 finding (privacy controls, noul 0.35) and the round-2 triage
(residual vector: caller-supplied references, 0.66; direct identifier smuggled as a
whitespace-free token would pass, noul 0.15).

Slice: Zyara Network N5/C2 "Derived Human + Agent Activity". Synthetic/local qualification only.

Pipeline: authoritative domain event -> closed-registry normalization -> derived activity event
(append-only) -> tenant/branch/actor/subject projection -> feed/search/notification input.
No reverse edge exists. Activity holds no handle to any domain store.

## Control 1: no free text exists anywhere in an activity record

An activity record contains only closed-enum codes, fixed-shape opaque references, small
integers and timestamps. There is no prose column, no title column, no note column and no
summary field.

Human-readable feed titles are derived at read time from the closed enumerations (category,
action, result, subject_type), never stored. A caller cannot place patient text, a clinical
narrative, a provider message body, a file name, a free-text reason or a model explanation
into a feed title or a feed row, because no field accepts text containing a space.

## Control 2 (REVISED in revision 3): the projector mints references; callers never supply them

Revision 3 removes caller-supplied references from storage entirely.

- The projector accepts internal identifiers only (a subject id, an account id, an agent id)
  and derives the stored reference itself as a deterministic tenant-scoped pseudonym:
  ref = type prefix + hex digest over tenant, reference type and internal identifier. The
  stored alphabet is therefore fixed hexadecimal with a fixed prefix.
- A direct identifier (name, phone number, national id, email, medical record number) cannot
  be stored, because the raw value is never written: only its digest is. Even a
  whitespace-free direct identifier has no path into a reference column.
- The digest is deterministic, so activity for the same subject remains correlatable inside
  one tenant while being non-reversible outside the projection.
- Agent actors additionally keep a foreign key to the C1 agent identities row for the same
  tenant, which is already a pseudonymous server-issued id.

## Control 3: source-owned strings are pattern-bounded and identifier-refusing

The remaining caller-supplied strings are source-owned metadata (source domain, source event
id, source reference, source revision, correlation id, idempotency key). Each must match a
bounded reference pattern of the form ^[A-Za-z0-9_.:-]{1,128}$ and is additionally refused
when it looks like a direct identifier: a pure digit run of seven or more characters, or any
run of nine or more consecutive digits, is rejected. Whitespace, "@" and "+" are outside the
alphabet, so an email address or an international phone number cannot be stored.

## Control 4: payload is a closed map of codes and small integers

The optional payload is a flat JSON object whose keys are drawn from a closed allowlist
(channel, provider, attempt, count, taskKind, previousValue, newValue, originKind). Enum-valued
keys are validated against their own closed registries; numeric-valued keys accept only small
integers. Payload text is size-bounded and is additionally refused when it matches credential
or secret patterns (secret://, bearer, api key, access or refresh token, app secret, verify
token, private key, password, credential, authorization header, EAAG prefix, PEM header).

## Storage

New table `activity_events`, tenant and optional branch scoped, forced row level security,
application role privileges exactly SELECT and INSERT (no UPDATE, no DELETE). Columns: id,
tenant_id, branch_id, actor_kind, actor_account_id, actor_agent_id, actor_ref, source_domain,
source_event_id, source_event_version, projection_version, category, action, result,
subject_type, subject_ref, sensitivity, visibility_scope, correlation_id, occurred_at,
recorded_at, payload, supersedes_activity_id, source_ref, source_revision.

Closed registries are enforced both in the database as CHECK constraints and in the domain
layer: actor_kind in {human, agent, system, external}; source_domain in {workforce.tasks,
identity.agents, communications.whatsapp}; sensitivity in {operational, restricted};
visibility_scope in {tenant, branch, workflow, private}; category, action, result and
subject_type each closed.

Actor integrity: human requires a non-null server-authoritative account id; agent requires a
non-null actor_agent_id that is a foreign key into the C1 agent_identities table for the same
tenant; system and external require a minted namespaced reference. A free-text actor name can
never satisfy the model.

## Deduplication, correction, authority

Unique on (tenant_id, source_domain, source_event_id, projection_version). A replay returns the
original record; a replay with divergent content raises a conflict error. Correction appends a
superseding record carrying supersedes_activity_id plus a correlation id; history is never
rewritten. Revoked agent activity remains readable and is annotated with the resolved authority
state at projection time, so it never implies a current grant.

## Reads

Operations readers receive sensitivity=operational only, scoped by tenant and branch,
deny-by-default membership with AAL2. sensitivity=restricted is refused to org and branch
administrators who hold no clinical role. The read surface derives titles from enumerations
only and never joins clinical data.

No public HTTP write route exists: a client-declared "authoritative event" would fabricate
source-domain authority.

## Known residual risk (accepted, disclosed)

Metadata inference remains: an operations reader can still observe that an operational,
non-clinical event occurred in a branch at a time, and the pseudonym is stable inside the
tenant, so activity can be correlated across events. Mitigations: the closed source registry
admits no clinical domain in this slice, so no clinical finding, result value, medication,
diagnosis or note is expressible; restricted reads are clinically gated; and no clinical data
is joined at read time. This residual is disclosed rather than claimed closed.

## Explicit non-goals

No agent credential verification (C1 gap unchanged), no unified inbox, no notification
fan-out, no clinical surface, no search index, no Buzz/Nostr transport, no C3 approval queue,
no C4 audit-chain claim, no PHI, no production readiness.
