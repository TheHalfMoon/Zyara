// W4 WhatsApp persistence smoke: real PostgreSQL proof for tenant isolation,
// branch integrity, outbound idempotency and append-only webhook receipts.
// Requires DATABASE_URL (CI postgres service or local PG); skips otherwise.
import { readFileSync } from "node:fs";
import pkg from "pg";

const { Client } = pkg;
const url = process.env.DATABASE_URL;
if (!url) {
  console.log("SKIP: no DATABASE_URL");
  process.exit(0);
}

const migrations = new URL("../../../db/migrations/", import.meta.url);
const client = new Client({ connectionString: url });
await client.connect();

for (const file of [
  "002_authz_primitives.sql",
  "006_provider_graph.sql",
  "038_workforce_graph.sql",
  "041_whatsapp_adapter.sql",
]) {
  await client.query(readFileSync(new URL(file, migrations), "utf8"));
}

for (const table of [
  "whatsapp_webhook_receipts",
  "whatsapp_outbound_operations",
  "whatsapp_accounts",
]) {
  await client.query(`DELETE FROM ${table}`);
}

await client.query(`INSERT INTO tenants(id,name) VALUES ('t1','Clinic One'),('t2','Clinic Two') ON CONFLICT DO NOTHING`);
await client.query(
  `INSERT INTO organizations(id,tenant_id) VALUES ('org-1','t1'),('org-2','t2') ON CONFLICT DO NOTHING`,
);
await client.query(
  `INSERT INTO branch_locations(id,tenant_id,organization_id)
   VALUES ('b1','t1','org-1'),('b1-alt','t1','org-1'),('b2','t2','org-2') ON CONFLICT DO NOTHING`,
);

function fail(message) {
  throw new Error(message);
}

async function expectDbError(run, sqlstate, label) {
  try {
    await run();
  } catch (error) {
    if (error.code === sqlstate) return;
    fail(`${label}: expected SQLSTATE ${sqlstate}, got ${error.code}: ${error.message}`);
  }
  fail(`${label}: expected SQLSTATE ${sqlstate}, but the statement succeeded`);
}

await client.query(`SET app.current_tenant='t1'`);

await client.query(
  `INSERT INTO whatsapp_accounts(
     id,tenant_id,branch_id,business_account_id,phone_number_id,
     app_secret_ref,verify_token_ref,enabled,source_ref,source_revision)
   VALUES ('wa-1','t1','b1','business-1','phone-1',
     'secret://whatsapp/app-secret','secret://whatsapp/verify-token',
     true,'w4-smoke','w4-smoke')`,
);

await expectDbError(
  () => client.query(
    `INSERT INTO whatsapp_accounts(
       id,tenant_id,branch_id,business_account_id,phone_number_id,
       app_secret_ref,verify_token_ref,enabled,source_ref,source_revision)
     VALUES ('wa-cross','t1','b2','business-x','phone-x',
       'secret://x','secret://y',true,'w4-smoke','w4-smoke')`,
  ),
  "23503",
  "cross-tenant branch reference must be refused",
);

await client.query(`SET ROLE zyara_app`);
await client.query(`SET app.current_tenant='t1'`);

await expectDbError(
  () => client.query(
    `UPDATE whatsapp_accounts SET app_secret_ref='secret://attacker' WHERE id='wa-1'`,
  ),
  "42501",
  "ordinary app role must not rewrite credential secret references",
);

await client.query(
  `INSERT INTO whatsapp_outbound_operations(
     id,tenant_id,branch_id,account_id,patient_ref,destination_ref,
     template_id,locale,purpose,consent_assertion_ref,idempotency_key,status)
   VALUES ('out-1','t1','b1','wa-1','patient-ref-1','contact-ref-1',
     'reminder','ar','appointment_operations','consent-ref-1','idem-1','queued')`,
);

await expectDbError(
  () => client.query(
    `INSERT INTO whatsapp_outbound_operations(
       id,tenant_id,branch_id,account_id,patient_ref,destination_ref,
       template_id,locale,purpose,consent_assertion_ref,idempotency_key,status)
     VALUES ('out-2','t1','b1','wa-1','patient-ref-1','contact-ref-1',
       'reminder','ar','appointment_operations','consent-ref-1','idem-1','queued')`,
  ),
  "23505",
  "duplicate outbound idempotency key must be refused",
);

await expectDbError(
  () => client.query(
    `INSERT INTO whatsapp_outbound_operations(
       id,tenant_id,branch_id,account_id,patient_ref,destination_ref,
       template_id,locale,purpose,consent_assertion_ref,idempotency_key,status)
     VALUES ('out-cross-branch','t1','b1-alt','wa-1','patient-ref-1','contact-ref-1',
       'reminder','ar','appointment_operations','consent-ref-1','idem-cross','queued')`,
  ),
  "23503",
  "outbound operation must use the branch owning the WhatsApp account",
);

await client.query(
  `INSERT INTO whatsapp_webhook_receipts(
     id,tenant_id,account_id,provider_event_key,event_kind,
     provider_message_ref,provider_status,payload_digest)
   VALUES ('receipt-1','t1','wa-1','message:wamid.1','message_received',
     'wamid.1',NULL,repeat('a',64))`,
);

await expectDbError(
  () => client.query(
    `INSERT INTO whatsapp_webhook_receipts(
       id,tenant_id,account_id,provider_event_key,event_kind,
       provider_message_ref,provider_status,payload_digest)
     VALUES ('receipt-2','t1','wa-1','message:wamid.1','message_received',
       'wamid.1',NULL,repeat('a',64))`,
  ),
  "23505",
  "duplicate provider event key must be refused",
);

await expectDbError(
  () => client.query(`UPDATE whatsapp_webhook_receipts SET provider_status='rewritten' WHERE id='receipt-1'`),
  "42501",
  "webhook receipts must stay append-only (no UPDATE grant)",
);
await expectDbError(
  () => client.query(`DELETE FROM whatsapp_webhook_receipts WHERE id='receipt-1'`),
  "42501",
  "webhook receipts must stay append-only (no DELETE grant)",
);

const own = await client.query(`SELECT count(*)::int AS n FROM whatsapp_accounts`);
if (own.rows[0].n !== 1) fail(`expected one t1 WhatsApp account, got ${own.rows[0].n}`);

await client.query(`SET app.current_tenant='t2'`);
const foreignAccounts = await client.query(`SELECT count(*)::int AS n FROM whatsapp_accounts`);
const foreignReceipts = await client.query(`SELECT count(*)::int AS n FROM whatsapp_webhook_receipts`);
if (foreignAccounts.rows[0].n !== 0 || foreignReceipts.rows[0].n !== 0) {
  fail("tenant read isolation failed for WhatsApp tables");
}

await client.query(`RESET ROLE`);
const secretColumns = await client.query(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name='whatsapp_accounts'
     AND column_name IN ('app_secret','verify_token','access_token','meta_token')`,
);
if (secretColumns.rows.length !== 0) {
  fail(`secret-bearing columns unexpectedly persisted: ${JSON.stringify(secretColumns.rows)}`);
}

console.log("W4 WhatsApp DB smoke PASS: RLS, branch integrity, idempotency, append-only receipts and secret-reference schema verified");
await client.end();
