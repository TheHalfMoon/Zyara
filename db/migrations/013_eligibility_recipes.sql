-- M013: typed eligibility rules + resource recipes (immutable versions).
-- Rules and recipes are append-only: a semantic change INSERTs a new version row;
-- history rows are never UPDATEed or DELETEd by the application role.
-- Safe rollback: DROP TABLE IF EXISTS resource_recipes, eligibility_rules (in that order).

CREATE TABLE IF NOT EXISTS eligibility_rules (
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  tenant_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  type_id TEXT NOT NULL DEFAULT '*',
  family TEXT NOT NULL CHECK (family IN (
    'age','new_returning','service_reason','insurance','referral','order',
    'provider_site_resources','language','telehealth_geography','intake',
    'interval','accepting_new')),
  effective_from DATE NOT NULL,
  effective_to DATE,
  issuer TEXT NOT NULL CHECK (issuer IN ('platform','provider')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS resource_recipes (
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  tenant_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  type_id TEXT NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version)
);

ALTER TABLE eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE resource_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_recipes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eligibility_isolation ON eligibility_rules;
CREATE POLICY eligibility_isolation ON eligibility_rules
  USING (tenant_id = current_setting('app.current_tenant', true));

DROP POLICY IF EXISTS recipe_isolation ON resource_recipes;
CREATE POLICY recipe_isolation ON resource_recipes
  USING (tenant_id = current_setting('app.current_tenant', true));

-- Append-only for the application role: SELECT + INSERT only. No UPDATE/DELETE.
GRANT SELECT, INSERT ON eligibility_rules, resource_recipes TO zyara_app;

-- ROLLBACK (manual, audited):
-- DROP TABLE IF EXISTS resource_recipes, eligibility_rules;
