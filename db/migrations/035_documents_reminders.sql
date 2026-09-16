-- M054 documents and medication reminders (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS patient_documents (
  doc_id text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  kind text NOT NULL,
  scan_status text NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending', 'clean', 'infected')),
  consented boolean NOT NULL DEFAULT false,
  CHECK (consented = true)
);
CREATE TABLE IF NOT EXISTS medication_reminders (
  reminder_id text PRIMARY KEY,
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  medication_name text NOT NULL,
  time_local text NOT NULL,
  consented_channel text NULL,
  clinician_sourced boolean NOT NULL DEFAULT false,
  time_zone text NOT NULL
);
