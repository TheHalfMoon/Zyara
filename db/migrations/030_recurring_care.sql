-- M048 recurring series and care episodes (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS care_series (
  series_id text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  service_id text NOT NULL,
  recurrence text NOT NULL CHECK (recurrence IN ('weekly', 'fortnightly', 'monthly')),
  first_start timestamptz NOT NULL,
  duration_min integer NOT NULL CHECK (duration_min > 0),
  end_date timestamptz NOT NULL,
  max_occurrences integer NOT NULL CHECK (max_occurrences BETWEEN 1 AND 12),
  recall_plan_id uuid NULL REFERENCES recall_plans (id),
  CHECK (first_start < end_date)
);
CREATE TABLE IF NOT EXISTS care_episodes (
  episode_id text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  recall_plan_id uuid NULL REFERENCES recall_plans (id),
  appointment_ids uuid[] NOT NULL DEFAULT '{}',
  sibling_policy text NOT NULL DEFAULT 'independent' CHECK (sibling_policy = 'independent')
);
