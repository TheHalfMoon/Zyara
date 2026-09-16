-- M049 care modalities (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS appointment_modalities (
  appointment_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  modality text NOT NULL CHECK (modality IN ('in-person', 'telehealth', 'home-visit')),
  telehealth_link text NULL,
  telehealth_consented boolean NOT NULL DEFAULT false,
  home_visit_state text NULL CHECK (home_visit_state IN ('requested', 'approved', 'declined', 'booked')),
  eligible_modalities text[] NOT NULL DEFAULT '{in-person}',
  CHECK ((modality <> 'telehealth') OR (telehealth_link IS NOT NULL AND telehealth_consented = true)),
  CHECK ((modality <> 'home-visit') OR (home_visit_state IS NOT NULL))
);
