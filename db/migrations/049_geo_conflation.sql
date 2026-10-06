-- GEO-01C: external spatial identity and conflation (additive).
-- Authority: docs/canonical/ZYARA_GEOSPATIAL_PLATFORM_PLAN_2026-09-22.md §§13A, 23 and
-- docs/evidence/GEO/GEO-01C/WORK_PACKET.md.
--
-- Basemap and geocoder POIs are external observations, never Zyara provider identities. They
-- are recorded as evidence and can open coordinate conflicts; they never create a facility,
-- move a point or delete Zyara truth. A canonical link from an external id to a branch is an
-- append-only, audited event; an automated actor may only link a provider-declared exact id,
-- and every other link, every unlink and every conflict resolution is a provider or Zyara admin
-- decision with evidence. Coordinate corrections are GEO-01A superseding assertions plus an
-- append-only correction record whose distance the database measures itself. All tables carry
-- facility data only: no patient, account or session location.

-- ---------------------------------------------------------------------------
-- External namespaces: reference data managed by the migrator only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geo_external_namespaces (
  namespace TEXT PRIMARY KEY CHECK (namespace ~ '^[a-z][a-z0-9-]{1,31}$'),
  authority TEXT NOT NULL CHECK (authority IN ('OPEN_DATA', 'REGULATOR', 'GEOCODER')),
  -- Anchored pattern for this namespace's external ids.
  id_pattern TEXT NOT NULL CHECK (id_pattern ~ '^\^.+\$$' AND char_length(id_pattern) <= 200),
  link_allowed BOOLEAN NOT NULL,
  -- Geocoder output never self-verifies (plan §23).
  CHECK (authority <> 'GEOCODER' OR NOT link_allowed)
);

-- OSM is the only external ecosystem with an adoption record; no geocoder is admitted.
INSERT INTO geo_external_namespaces(namespace, authority, id_pattern, link_allowed) VALUES
  ('osm-node', 'OPEN_DATA', '^[1-9][0-9]{0,15}$', TRUE),
  ('osm-way', 'OPEN_DATA', '^[1-9][0-9]{0,15}$', TRUE),
  ('osm-relation', 'OPEN_DATA', '^[1-9][0-9]{0,15}$', TRUE)
ON CONFLICT (namespace) DO NOTHING;

-- An external id must match its namespace's pattern; a link also needs a linkable namespace.
CREATE OR REPLACE FUNCTION geo_external_id_ok(ns TEXT, external_id TEXT, for_link BOOLEAN) RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE((
    SELECT external_id ~ n.id_pattern AND (NOT for_link OR n.link_allowed)
    FROM public.geo_external_namespaces n
    WHERE n.namespace = ns
  ), FALSE)
$$;

-- ---------------------------------------------------------------------------
-- External observations: evidence only, append-only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geo_external_observations (
  id TEXT NOT NULL CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  namespace TEXT NOT NULL REFERENCES geo_external_namespaces(namespace) ON DELETE RESTRICT,
  external_id TEXT NOT NULL CHECK (external_id ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$'),
  presence TEXT NOT NULL CHECK (presence IN ('PRESENT', 'ABSENT')),
  point geometry,
  name TEXT CHECK (name IS NULL OR (char_length(name) <= 200 AND geo_public_text_ok(name))),
  source_revision TEXT NOT NULL CHECK (source_revision ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  observed_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (id, tenant_id),
  CHECK ((presence = 'PRESENT') = (point IS NOT NULL)),
  CHECK (point IS NULL OR (
    GeometryType(point) = 'POINT'
    AND ST_SRID(point) = 4326
    AND ST_NDims(point) = 2
    AND NOT ST_IsEmpty(point)
    AND ST_X(point) BETWEEN -180 AND 180
    AND ST_Y(point) BETWEEN -90 AND 90
  ))
);
CREATE INDEX IF NOT EXISTS geo_external_observations_ext_idx
  ON geo_external_observations(tenant_id, namespace, external_id);

-- Checked by trigger rather than CHECK, because the rule reads the namespace table.
CREATE OR REPLACE FUNCTION geo_external_observations_guard() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.geo_external_id_ok(NEW.namespace, NEW.external_id, FALSE) THEN
    RAISE EXCEPTION 'external id does not match namespace %', NEW.namespace USING ERRCODE = '23514';
  END IF;
  NEW.recorded_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS geo_external_observations_guard ON geo_external_observations;
CREATE TRIGGER geo_external_observations_guard
  BEFORE INSERT ON geo_external_observations
  FOR EACH ROW EXECUTE FUNCTION geo_external_observations_guard();

-- ---------------------------------------------------------------------------
-- Canonical links: append-only LINK / UNLINK events.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geo_external_links (
  id TEXT NOT NULL CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  namespace TEXT NOT NULL REFERENCES geo_external_namespaces(namespace) ON DELETE RESTRICT,
  external_id TEXT NOT NULL CHECK (external_id ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$'),
  action TEXT NOT NULL CHECK (action IN ('LINK', 'UNLINK')),
  unlinks_id TEXT,
  basis TEXT NOT NULL CHECK (basis IN ('DETERMINISTIC_ID', 'REVIEWED_EVIDENCE')),
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('SYSTEM', 'PROVIDER', 'ZYARA_ADMIN')),
  actor_ref TEXT NOT NULL CHECK (actor_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  evidence_ref TEXT NOT NULL CHECK (evidence_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  reason_code TEXT NOT NULL CHECK (reason_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (id, tenant_id, branch_id, namespace, external_id),
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  -- An UNLINK ends a link of the same tenant, branch, namespace and external id.
  FOREIGN KEY (unlinks_id, tenant_id, branch_id, namespace, external_id)
    REFERENCES geo_external_links(id, tenant_id, branch_id, namespace, external_id) ON DELETE RESTRICT,
  CHECK ((action = 'LINK') = (unlinks_id IS NULL)),
  -- The automated actor may only link a provider-declared exact id, and never unlinks.
  CHECK (actor_kind <> 'SYSTEM' OR (action = 'LINK' AND basis = 'DETERMINISTIC_ID')),
  -- Spatial and name evidence is a proposal: a provider or Zyara admin decides.
  CHECK (basis <> 'REVIEWED_EVIDENCE' OR actor_kind IN ('PROVIDER', 'ZYARA_ADMIN')),
  CHECK (action <> 'UNLINK' OR basis = 'REVIEWED_EVIDENCE')
);
CREATE UNIQUE INDEX IF NOT EXISTS geo_external_links_one_unlink_uidx
  ON geo_external_links(unlinks_id) WHERE unlinks_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS geo_external_links_ext_idx
  ON geo_external_links(tenant_id, namespace, external_id);
CREATE INDEX IF NOT EXISTS geo_external_links_branch_idx
  ON geo_external_links(tenant_id, branch_id, namespace);

-- One active link per (tenant, namespace, external id) and per (tenant, branch, namespace).
-- Transaction advisory locks on both keys serialize concurrent links, and each statement in
-- this VOLATILE function takes a fresh snapshot (READ COMMITTED), so a link committed by the
-- lock holder is seen. An UNLINK must end a LINK row.
CREATE OR REPLACE FUNCTION geo_external_links_guard() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_action TEXT;
BEGIN
  -- The checks below are exact only under READ COMMITTED, where each statement takes a fresh
  -- snapshot after the advisory lock. Under REPEATABLE READ or SERIALIZABLE the snapshot can
  -- predate a concurrent commit (SSI does not track READ COMMITTED writers), so refuse rather
  -- than fail open.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'this write requires READ COMMITTED isolation' USING ERRCODE = '25000';
  END IF;
  IF NOT public.geo_external_id_ok(NEW.namespace, NEW.external_id, TRUE) THEN
    RAISE EXCEPTION 'namespace % is not linkable or the external id does not match it', NEW.namespace USING ERRCODE = '23514';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('geo_link_id:' || NEW.tenant_id || ':' || NEW.namespace || ':' || NEW.external_id, 0));
  IF NEW.action = 'LINK' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('geo_link_branch:' || NEW.tenant_id || ':' || NEW.branch_id || ':' || NEW.namespace, 0));
    IF EXISTS (
      SELECT 1 FROM public.geo_external_links l
      WHERE l.tenant_id = NEW.tenant_id AND l.namespace = NEW.namespace AND l.external_id = NEW.external_id
        AND l.action = 'LINK'
        AND NOT EXISTS (SELECT 1 FROM public.geo_external_links u WHERE u.unlinks_id = l.id)
    ) THEN
      RAISE EXCEPTION 'external id %:% already has an active link', NEW.namespace, NEW.external_id USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.geo_external_links l
      WHERE l.tenant_id = NEW.tenant_id AND l.branch_id = NEW.branch_id AND l.namespace = NEW.namespace
        AND l.action = 'LINK'
        AND NOT EXISTS (SELECT 1 FROM public.geo_external_links u WHERE u.unlinks_id = l.id)
    ) THEN
      RAISE EXCEPTION 'branch % already has an active % link', NEW.branch_id, NEW.namespace USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT l.action INTO target_action FROM public.geo_external_links l
    WHERE l.id = NEW.unlinks_id AND l.tenant_id = NEW.tenant_id;
    IF target_action IS DISTINCT FROM 'LINK' THEN
      RAISE EXCEPTION 'an UNLINK must end a LINK' USING ERRCODE = '23514';
    END IF;
  END IF;
  NEW.recorded_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS geo_external_links_guard ON geo_external_links;
CREATE TRIGGER geo_external_links_guard
  BEFORE INSERT ON geo_external_links
  FOR EACH ROW EXECUTE FUNCTION geo_external_links_guard();

-- ---------------------------------------------------------------------------
-- Coordinate corrections: append-only, distance measured by the database.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geo_coordinate_corrections (
  id TEXT NOT NULL CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  from_assertion_id TEXT NOT NULL,
  to_assertion_id TEXT NOT NULL,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('PROVIDER', 'ZYARA_ADMIN')),
  actor_ref TEXT NOT NULL CHECK (actor_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  reviewer_ref TEXT CHECK (reviewer_ref IS NULL OR reviewer_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  evidence_ref TEXT NOT NULL CHECK (evidence_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  reason_code TEXT NOT NULL CHECK (reason_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  -- Set by the guard trigger from the two stored points; never supplied by the client.
  moved_m DOUBLE PRECISION CHECK (moved_m IS NULL OR moved_m >= 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (to_assertion_id),
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (from_assertion_id, tenant_id, branch_id) REFERENCES geo_location_assertions(id, tenant_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (to_assertion_id, tenant_id, branch_id) REFERENCES geo_location_assertions(id, tenant_id, branch_id) ON DELETE RESTRICT,
  CHECK (from_assertion_id <> to_assertion_id),
  CHECK (reviewer_ref IS NULL OR reviewer_ref <> actor_ref)
);
CREATE INDEX IF NOT EXISTS geo_coordinate_corrections_actor_idx
  ON geo_coordinate_corrections(tenant_id, actor_ref, recorded_at);

-- The anchor point at or before an assertion. Anchored assertions are the chain root and the
-- targets of correction records (with reviewed_only, only corrections that carry a reviewer).
-- The anchor is the point of the nearest anchored assertion that has one; when none has a point
-- (an UNKNOWN root with no correction yet), it is the oldest point in the chain. Every move is
-- measured from the anchor, so neither a detour through UNKNOWN nor a series of small unaudited
-- steps can walk a facility away; the reviewer rule is measured from the reviewed anchor, so
-- audited steps without review cannot add up past the large-move limit either.
CREATE OR REPLACE FUNCTION geo_anchor_point(start_id TEXT, tenant TEXT, reviewed_only BOOLEAN) RETURNS geometry
LANGUAGE sql STABLE
SET search_path = pg_catalog, public
AS $$
  WITH RECURSIVE chain(id, point, supersedes_id, anchored, depth) AS (
    SELECT a.id, a.point, a.supersedes_id,
      a.supersedes_id IS NULL OR EXISTS (
        SELECT 1 FROM public.geo_coordinate_corrections k
        WHERE k.to_assertion_id = a.id AND k.tenant_id = a.tenant_id AND (NOT reviewed_only OR k.reviewer_ref IS NOT NULL)
      ),
      0
    FROM public.geo_location_assertions a
    WHERE a.id = start_id AND a.tenant_id = tenant
    UNION ALL
    SELECT p.id, p.point, p.supersedes_id,
      p.supersedes_id IS NULL OR EXISTS (
        SELECT 1 FROM public.geo_coordinate_corrections k
        WHERE k.to_assertion_id = p.id AND k.tenant_id = p.tenant_id AND (NOT reviewed_only OR k.reviewer_ref IS NOT NULL)
      ),
      c.depth + 1
    FROM chain c
    JOIN public.geo_location_assertions p ON p.id = c.supersedes_id AND p.tenant_id = tenant
    WHERE NOT (c.anchored AND c.point IS NOT NULL)
  )
  SELECT point FROM chain
  WHERE point IS NOT NULL
  ORDER BY anchored DESC, CASE WHEN anchored THEN depth ELSE -depth END
  LIMIT 1
$$;

-- The correcting assertion directly supersedes the corrected one. A move of more than 1 000 m
-- (from the anchor, or in total from the reviewed anchor), and any correction beyond 10 by one
-- actor in 24 hours, needs a distinct reviewer. A per-actor advisory lock keeps the count exact
-- under concurrency.
CREATE OR REPLACE FUNCTION geo_coordinate_corrections_guard() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  from_point geometry;
  reviewed_point geometry;
  to_point geometry;
  to_supersedes TEXT;
  drift DOUBLE PRECISION;
  recent INTEGER;
BEGIN
  -- The checks below are exact only under READ COMMITTED, where each statement takes a fresh
  -- snapshot after the advisory lock. Under REPEATABLE READ or SERIALIZABLE the snapshot can
  -- predate a concurrent commit (SSI does not track READ COMMITTED writers), so refuse rather
  -- than fail open.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'this write requires READ COMMITTED isolation' USING ERRCODE = '25000';
  END IF;
  from_point := public.geo_anchor_point(NEW.from_assertion_id, NEW.tenant_id, FALSE);
  reviewed_point := public.geo_anchor_point(NEW.from_assertion_id, NEW.tenant_id, TRUE);
  SELECT a.supersedes_id INTO to_supersedes FROM public.geo_location_assertions a
  WHERE a.id = NEW.to_assertion_id AND a.tenant_id = NEW.tenant_id;
  SELECT a.point INTO to_point FROM public.geo_location_assertions a
  WHERE a.id = NEW.to_assertion_id AND a.tenant_id = NEW.tenant_id;
  IF to_supersedes IS DISTINCT FROM NEW.from_assertion_id THEN
    RAISE EXCEPTION 'the correcting assertion must directly supersede the corrected one' USING ERRCODE = '23514';
  END IF;
  NEW.moved_m := CASE WHEN from_point IS NULL OR to_point IS NULL THEN NULL
                      ELSE ST_Distance(from_point::geography, to_point::geography) END;
  drift := CASE WHEN reviewed_point IS NULL OR to_point IS NULL THEN NULL
                 ELSE ST_Distance(reviewed_point::geography, to_point::geography) END;
  IF GREATEST(NEW.moved_m, drift) > 1000 AND NEW.reviewer_ref IS NULL THEN
    RAISE EXCEPTION 'a move of % m needs an independent reviewer', round(GREATEST(NEW.moved_m, drift)::numeric) USING ERRCODE = '23514';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('geo_correction_actor:' || NEW.tenant_id || ':' || NEW.actor_ref, 0));
  SELECT count(*) INTO recent FROM public.geo_coordinate_corrections c
  WHERE c.tenant_id = NEW.tenant_id AND c.actor_ref = NEW.actor_ref AND c.recorded_at > now() - interval '24 hours';
  IF recent >= 10 AND NEW.reviewer_ref IS NULL THEN
    RAISE EXCEPTION 'more than 10 corrections in 24 hours need an independent reviewer' USING ERRCODE = '23514';
  END IF;
  NEW.recorded_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS geo_coordinate_corrections_guard ON geo_coordinate_corrections;
CREATE TRIGGER geo_coordinate_corrections_guard
  BEFORE INSERT ON geo_coordinate_corrections
  FOR EACH ROW EXECUTE FUNCTION geo_coordinate_corrections_guard();

-- ---------------------------------------------------------------------------
-- Supersession authority and move audit on GEO-01A assertions (new triggers, additive).
-- ---------------------------------------------------------------------------
-- A weaker source cannot supersede a stronger head (EXTERNAL_DATASET 1, PROVIDER_ATTESTATION
-- and REGULATOR_REGISTRY 2, ZYARA_VERIFICATION 3; a VERIFIED or DISPUTED head needs 3, a
-- PROVIDER_ATTESTED head needs 2). A provider or regulator may still dispute any head without
-- moving it by more than 50 m; a dispute hides the point until Zyara verification resolves it,
-- so it cannot be a step to replace a verified point with a weaker one.
CREATE OR REPLACE FUNCTION geo_location_assertions_authority_guard() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  head_state TEXT;
  head_point geometry;
  source_rank INTEGER;
  required_rank INTEGER;
  dispute BOOLEAN;
BEGIN
  IF NEW.supersedes_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT a.verification_state INTO head_state FROM public.geo_location_assertions a
  WHERE a.id = NEW.supersedes_id AND a.tenant_id = NEW.tenant_id;
  IF head_state IS NULL THEN
    -- A missing predecessor is refused by the supersession foreign key.
    RETURN NEW;
  END IF;
  source_rank := CASE NEW.source_kind WHEN 'EXTERNAL_DATASET' THEN 1 WHEN 'ZYARA_VERIFICATION' THEN 3 ELSE 2 END;
  required_rank := CASE head_state WHEN 'UNVERIFIED' THEN 1 WHEN 'PROVIDER_ATTESTED' THEN 2 ELSE 3 END;
  head_point := public.geo_anchor_point(NEW.supersedes_id, NEW.tenant_id, FALSE);
  dispute := NEW.verification_state = 'DISPUTED' AND source_rank >= 2
    AND (NEW.point IS NULL OR head_point IS NULL OR ST_Distance(head_point::geography, NEW.point::geography) <= 50);
  IF NOT dispute AND source_rank < required_rank THEN
    RAISE EXCEPTION 'a % source cannot supersede a % assertion', NEW.source_kind, head_state USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS geo_location_assertions_authority_guard ON geo_location_assertions;
CREATE TRIGGER geo_location_assertions_authority_guard
  BEFORE INSERT ON geo_location_assertions
  FOR EACH ROW EXECUTE FUNCTION geo_location_assertions_authority_guard();

-- A superseding assertion more than 50 m from the audited anchor commits only together with
-- its correction record (actor and evidence). Checked at commit, fail-closed.
CREATE OR REPLACE FUNCTION geo_location_assertions_move_audit() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  head_point geometry;
  head_found BOOLEAN;
BEGIN
  IF NEW.supersedes_id IS NULL OR NEW.point IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT TRUE INTO head_found FROM public.geo_location_assertions a
  WHERE a.id = NEW.supersedes_id AND a.tenant_id = NEW.tenant_id;
  IF head_found IS NOT TRUE THEN
    RAISE EXCEPTION 'the superseded assertion is not visible; cannot audit the move' USING ERRCODE = '23514';
  END IF;
  head_point := public.geo_anchor_point(NEW.supersedes_id, NEW.tenant_id, FALSE);
  IF head_point IS NOT NULL
     AND ST_Distance(head_point::geography, NEW.point::geography) > 50
     AND NOT EXISTS (
       SELECT 1 FROM public.geo_coordinate_corrections c
       WHERE c.to_assertion_id = NEW.id AND c.tenant_id = NEW.tenant_id AND c.from_assertion_id = NEW.supersedes_id
     ) THEN
    RAISE EXCEPTION 'a coordinate move of more than 50 m needs a correction record' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS geo_location_assertions_move_audit ON geo_location_assertions;
CREATE CONSTRAINT TRIGGER geo_location_assertions_move_audit
  AFTER INSERT ON geo_location_assertions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION geo_location_assertions_move_audit();

-- ---------------------------------------------------------------------------
-- Coordinate conflicts: append-only; open until a resolution row references them.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geo_coordinate_conflicts (
  id TEXT NOT NULL CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  assertion_id TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('COORDINATE_MISMATCH', 'EXTERNAL_ABSENT')),
  -- Set by the guard trigger; never supplied by the client.
  distance_m DOUBLE PRECISION CHECK (distance_m IS NULL OR distance_m >= 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (id, tenant_id, branch_id),
  UNIQUE (observation_id, assertion_id),
  FOREIGN KEY (branch_id, tenant_id) REFERENCES branch_locations(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (assertion_id, tenant_id, branch_id) REFERENCES geo_location_assertions(id, tenant_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (observation_id, tenant_id) REFERENCES geo_external_observations(id, tenant_id) ON DELETE RESTRICT,
  CHECK ((kind = 'COORDINATE_MISMATCH') = (distance_m IS NOT NULL))
);

-- A conflict needs an observation of an id actively linked to the branch, against the branch's
-- current assertion. A mismatch is measured here and must exceed max(150 m, accuracy).
CREATE OR REPLACE FUNCTION geo_coordinate_conflicts_guard() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  obs RECORD;
  head RECORD;
BEGIN
  SELECT o.namespace, o.external_id, o.presence, o.point INTO obs FROM public.geo_external_observations o
  WHERE o.id = NEW.observation_id AND o.tenant_id = NEW.tenant_id;
  SELECT a.point, a.accuracy_m INTO head FROM public.geo_location_assertions a
  WHERE a.id = NEW.assertion_id AND a.tenant_id = NEW.tenant_id AND a.branch_id = NEW.branch_id
    AND NOT EXISTS (SELECT 1 FROM public.geo_location_assertions s WHERE s.supersedes_id = a.id AND s.tenant_id = a.tenant_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'a conflict is raised against the current assertion' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.geo_external_links l
    WHERE l.tenant_id = NEW.tenant_id AND l.branch_id = NEW.branch_id
      AND l.namespace = obs.namespace AND l.external_id = obs.external_id AND l.action = 'LINK'
      AND NOT EXISTS (SELECT 1 FROM public.geo_external_links u WHERE u.unlinks_id = l.id)
  ) THEN
    RAISE EXCEPTION 'the observed external id is not linked to this branch' USING ERRCODE = '23514';
  END IF;
  IF obs.presence = 'ABSENT' THEN
    IF NEW.kind <> 'EXTERNAL_ABSENT' THEN
      RAISE EXCEPTION 'an absent observation opens EXTERNAL_ABSENT' USING ERRCODE = '23514';
    END IF;
    NEW.distance_m := NULL;
  ELSE
    IF NEW.kind <> 'COORDINATE_MISMATCH' OR head.point IS NULL THEN
      RAISE EXCEPTION 'a present observation opens COORDINATE_MISMATCH against a point' USING ERRCODE = '23514';
    END IF;
    NEW.distance_m := ST_Distance(head.point::geography, obs.point::geography);
    IF NEW.distance_m <= GREATEST(150, COALESCE(head.accuracy_m, 0)) THEN
      RAISE EXCEPTION 'the observation agrees with the assertion within tolerance' USING ERRCODE = '23514';
    END IF;
  END IF;
  NEW.recorded_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS geo_coordinate_conflicts_guard ON geo_coordinate_conflicts;
CREATE TRIGGER geo_coordinate_conflicts_guard
  BEFORE INSERT ON geo_coordinate_conflicts
  FOR EACH ROW EXECUTE FUNCTION geo_coordinate_conflicts_guard();

CREATE TABLE IF NOT EXISTS geo_coordinate_conflict_resolutions (
  id TEXT NOT NULL CHECK (id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  resolves_id TEXT NOT NULL,
  resolution TEXT NOT NULL CHECK (resolution IN ('KEEP_ZYARA', 'CORRECTED', 'EXTERNAL_ERROR')),
  corrected_assertion_id TEXT,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('PROVIDER', 'ZYARA_ADMIN')),
  actor_ref TEXT NOT NULL CHECK (actor_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  evidence_ref TEXT NOT NULL CHECK (evidence_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  reason_code TEXT NOT NULL CHECK (reason_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  -- Each conflict is resolved once.
  UNIQUE (resolves_id),
  FOREIGN KEY (resolves_id, tenant_id, branch_id) REFERENCES geo_coordinate_conflicts(id, tenant_id, branch_id) ON DELETE RESTRICT,
  FOREIGN KEY (corrected_assertion_id, tenant_id, branch_id) REFERENCES geo_location_assertions(id, tenant_id, branch_id) ON DELETE RESTRICT,
  CHECK ((resolution = 'CORRECTED') = (corrected_assertion_id IS NOT NULL))
);

-- CORRECTED names an audited correction of the conflicted assertion.
CREATE OR REPLACE FUNCTION geo_conflict_resolutions_guard() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.resolution = 'CORRECTED' AND NOT EXISTS (
    SELECT 1 FROM public.geo_coordinate_corrections c
    JOIN public.geo_coordinate_conflicts k ON k.id = NEW.resolves_id AND k.tenant_id = NEW.tenant_id
    WHERE c.tenant_id = NEW.tenant_id AND c.to_assertion_id = NEW.corrected_assertion_id
      AND c.from_assertion_id = k.assertion_id
  ) THEN
    RAISE EXCEPTION 'CORRECTED needs a correction record of the conflicted assertion' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS geo_conflict_resolutions_guard ON geo_coordinate_conflict_resolutions;
CREATE TRIGGER geo_conflict_resolutions_guard
  BEFORE INSERT ON geo_coordinate_conflict_resolutions
  FOR EACH ROW EXECUTE FUNCTION geo_conflict_resolutions_guard();

-- ---------------------------------------------------------------------------
-- RLS, views and grants
-- ---------------------------------------------------------------------------
ALTER TABLE geo_external_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_external_observations FORCE ROW LEVEL SECURITY;
ALTER TABLE geo_external_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_external_links FORCE ROW LEVEL SECURITY;
ALTER TABLE geo_coordinate_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_coordinate_corrections FORCE ROW LEVEL SECURITY;
ALTER TABLE geo_coordinate_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_coordinate_conflicts FORCE ROW LEVEL SECURITY;
ALTER TABLE geo_coordinate_conflict_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_coordinate_conflict_resolutions FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['geo_external_observations', 'geo_external_links', 'geo_coordinate_corrections',
                           'geo_coordinate_conflicts', 'geo_coordinate_conflict_resolutions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = current_setting(''app.current_tenant'', true))', t || '_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true))', t || '_insert', t);
  END LOOP;
END;
$$;

CREATE OR REPLACE VIEW geo_active_external_links
WITH (security_invoker = true) AS
SELECT l.id, l.tenant_id, l.branch_id, l.namespace, l.external_id, l.basis, l.actor_kind, l.actor_ref,
       l.evidence_ref, l.reason_code, l.recorded_at
FROM geo_external_links l
WHERE l.action = 'LINK'
  AND NOT EXISTS (SELECT 1 FROM geo_external_links u WHERE u.unlinks_id = l.id AND u.tenant_id = l.tenant_id);

CREATE OR REPLACE VIEW geo_open_coordinate_conflicts
WITH (security_invoker = true) AS
SELECT k.*
FROM geo_coordinate_conflicts k
WHERE NOT EXISTS (
  SELECT 1 FROM geo_coordinate_conflict_resolutions r WHERE r.resolves_id = k.id AND r.tenant_id = k.tenant_id
);

GRANT SELECT ON geo_external_namespaces TO zyara_app;
GRANT SELECT, INSERT ON geo_external_namespaces TO zyara_migrator;
GRANT SELECT ON geo_external_observations, geo_external_links, geo_coordinate_corrections,
  geo_coordinate_conflicts, geo_coordinate_conflict_resolutions,
  geo_active_external_links, geo_open_coordinate_conflicts TO zyara_app;
-- Column-level INSERT: recorded_at, moved_m and distance_m are always set by the database.
GRANT INSERT (id, tenant_id, namespace, external_id, presence, point, name, source_revision, observed_at)
  ON geo_external_observations TO zyara_app;
GRANT INSERT (id, tenant_id, branch_id, namespace, external_id, action, unlinks_id, basis, actor_kind,
  actor_ref, evidence_ref, reason_code) ON geo_external_links TO zyara_app;
GRANT INSERT (id, tenant_id, branch_id, from_assertion_id, to_assertion_id, actor_kind, actor_ref,
  reviewer_ref, evidence_ref, reason_code) ON geo_coordinate_corrections TO zyara_app;
GRANT INSERT (id, tenant_id, branch_id, assertion_id, observation_id, kind) ON geo_coordinate_conflicts TO zyara_app;
GRANT INSERT (id, tenant_id, branch_id, resolves_id, resolution, corrected_assertion_id, actor_kind,
  actor_ref, evidence_ref, reason_code) ON geo_coordinate_conflict_resolutions TO zyara_app;

-- ROLLBACK (manual, audited, only when no dependent data remains):
-- DROP VIEW IF EXISTS geo_open_coordinate_conflicts, geo_active_external_links;
-- DROP TRIGGER IF EXISTS geo_location_assertions_move_audit ON geo_location_assertions;
-- DROP TRIGGER IF EXISTS geo_location_assertions_authority_guard ON geo_location_assertions;
-- DROP TABLE IF EXISTS geo_coordinate_conflict_resolutions, geo_coordinate_conflicts,
--   geo_coordinate_corrections, geo_external_links, geo_external_observations, geo_external_namespaces;
-- DROP FUNCTION IF EXISTS geo_conflict_resolutions_guard(), geo_coordinate_conflicts_guard(),
--   geo_location_assertions_move_audit(), geo_location_assertions_authority_guard(),
--   geo_coordinate_corrections_guard(), geo_external_links_guard(), geo_external_observations_guard(),
--   geo_anchor_point(TEXT, TEXT, BOOLEAN), geo_external_id_ok(TEXT, TEXT, BOOLEAN);
