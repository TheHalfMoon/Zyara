-- M021: attendance evidence and review eligibility.
-- Evidence records source, actor, and confidence; corrections supersede
-- rather than erase history. Eligibility derives from current evidence only;
-- reminder delivery never grants it. Evidence is private: no patient free
-- text beyond bounded dispute reasons; reader scope enforced by RLS policy
-- in the owning service. Safe rollback: DROP TABLE IF EXISTS
-- attendance_disputes, attendance_evidence (in that order).

CREATE TABLE IF NOT EXISTS attendance_evidence (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  appointment_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('completed','no_show','unknown')),
  source TEXT NOT NULL CHECK (source IN ('provider_checkin','reception','imported','patient_dispute','reviewer_correction')),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('provider','receptionist','system','patient','trust_reviewer','importer')),
  actor_id TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded BOOLEAN NOT NULL DEFAULT FALSE,
  provenance TEXT,
  CONSTRAINT attendance_import_provenance CHECK (source <> 'imported' OR provenance IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_current_unique
  ON attendance_evidence (tenant_id, appointment_id)
  WHERE superseded = FALSE;

CREATE TABLE IF NOT EXISTS attendance_disputes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  appointment_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  raised_by TEXT NOT NULL CHECK (raised_by IN ('patient','provider')),
  reason TEXT NOT NULL CHECK (char_length(reason) <= 500),
  reviewer_role TEXT NOT NULL DEFAULT 'trust_reviewer' CHECK (reviewer_role = 'trust_reviewer'),
  outcome TEXT CHECK (outcome IN ('upheld','corrected','rejected'))
);
