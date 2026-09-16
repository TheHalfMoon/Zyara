-- M037 durable external operations (synthetic-capable schema).
CREATE TABLE IF NOT EXISTS external_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  adapter_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('create', 'cancel', 'reschedule')),
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 128),
  state text NOT NULL DEFAULT 'PENDING'
    CHECK (state IN ('PENDING', 'CONFIRMED', 'FAILED', 'UNKNOWN')),
  external_id text NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_error text NULL,
  UNIQUE (tenant_id, idempotency_key)
);
