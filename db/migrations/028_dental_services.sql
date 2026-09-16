-- M046 dental service catalog (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS dental_services (
  service text PRIMARY KEY CHECK (service IN ('checkup', 'cleaning', 'filling', 'extraction', 'root-canal')),
  recipe jsonb NOT NULL,
  recall_template text NOT NULL CHECK (recall_template IN ('dental-preventive', 'follow-up'))
);
INSERT INTO dental_services (service, recipe, recall_template) VALUES
  ('checkup', '[{"kind":"chair","qualifier":"dental-chair"},{"kind":"clinician","qualifier":"dentist-or-hygienist"}]', 'dental-preventive'),
  ('cleaning', '[{"kind":"chair","qualifier":"dental-chair"},{"kind":"clinician","qualifier":"dentist-or-hygienist"},{"kind":"assistant","qualifier":"dental-assistant"}]', 'dental-preventive'),
  ('filling', '[{"kind":"chair","qualifier":"dental-chair"},{"kind":"clinician","qualifier":"dentist"},{"kind":"assistant","qualifier":"dental-assistant"},{"kind":"equipment","qualifier":"restorative-kit"}]', 'follow-up'),
  ('extraction', '[{"kind":"chair","qualifier":"surgical-chair"},{"kind":"clinician","qualifier":"dentist"},{"kind":"assistant","qualifier":"dental-assistant"},{"kind":"equipment","qualifier":"surgical-kit"}]', 'follow-up'),
  ('root-canal', '[{"kind":"chair","qualifier":"surgical-chair"},{"kind":"clinician","qualifier":"dentist-endodontist"},{"kind":"assistant","qualifier":"dental-assistant"},{"kind":"equipment","qualifier":"endo-kit"}]', 'follow-up')
ON CONFLICT (service) DO UPDATE SET recipe = EXCLUDED.recipe, recall_template = EXCLUDED.recall_template;
