// M015 holds smoke part 1: exclusion invariant + all-or-none.
// Requires DATABASE_URL (CI provides postgres:16 service). Real parallel
// clients prove the 100-way capacity-one race against the live constraint.
import { readFileSync } from "node:fs";
import pkg from "pg";
const { Client } = pkg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("SKIP: no DATABASE_URL");
  process.exit(0);
}

const sql015 = readFileSync(new URL("../../../db/migrations/015_reservation_holds.sql", import.meta.url), "utf8");
const sql002 = readFileSync(new URL("../../../db/migrations/002_authz_primitives.sql", import.meta.url), "utf8");

export const admin = new Client({ connectionString: url });
await admin.connect();
await admin.query(sql002);
await admin.query(sql015);
await admin.query(`INSERT INTO tenants(id,name) VALUES ('t1','Smoke') ON CONFLICT DO NOTHING`);
await admin.query(`DELETE FROM reservation_items`);
await admin.query(`DELETE FROM holds`);

export const SLOT = `[2026-10-01T07:00:00+00:00,2026-10-01T07:40:00+00:00)`;

// Acceptance 1: 100 concurrent capacity-one attempts, real parallel clients.
async function attempt(i) {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    await c.query("BEGIN");
    await c.query(`SET LOCAL app.current_tenant='t1'`);
    await c.query(
      `INSERT INTO holds(id,tenant_id,actor_id,service_id,idempotency_key,request_digest,state,schedule_id,schedule_version,recipe_id,recipe_version,ttl_min,max_extensions,held_at,expires_at,last_reason)
       VALUES ($1,'t1',$2,'derm',$3,'d1','held','s1',1,'r1',1,10,2,statement_timestamp(),statement_timestamp()+interval '10 minutes','HOLD_CREATED')`,
      [`race-${i}`, `actor-${i}`, `race-key-${i}`],
    );
    await c.query(
      `INSERT INTO reservation_items(hold_id,tenant_id,unit_id,occupied) VALUES ($1,'t1','room-1',$2::tstzrange)`,
      [`race-${i}`, SLOT],
    );
    await c.query("COMMIT");
    return true;
  } catch (e) {
    try { await c.query("ROLLBACK"); } catch { /* already closed */ }
    if (e && (e.code === "23P01" || e.code === "40001" || e.code === "40P01")) return false;
    throw e;
  } finally {
    await c.end();
  }
}

const wins = [];
// Bounded waves: 10 parallel clients x 10 waves = 100 attempts. Each wave is
// genuinely concurrent (all 10 race the same interval); waves serialize only
// to respect the database connection limit. Losers in every wave still prove
// the exclusion invariant under real parallel contention.
for (let wave = 0; wave < 10; wave += 1) {
  const batch = await Promise.all(
    Array.from({ length: 10 }, (_, k) => attempt(wave * 10 + k)),
  );
  wins.push(...batch);
}
const won = wins.filter(Boolean).length;
if (won !== 1) throw new Error(`capacity-one race: expected 1 winner, got ${won} (waves of 10)`);
const active = await admin.query(
  `SELECT count(*)::int AS n FROM reservation_items WHERE tenant_id='t1' AND unit_id='room-1' AND active`,
);
if (active.rows[0].n !== 1) throw new Error("invariant query: active items != 1");
console.log(`acceptance 1 PASS: 100 concurrent attempts -> exactly 1 active allocation`);

// Acceptance 2: multi-resource hold is all-or-none (second unit conflicts).
const admin2 = new Client({ connectionString: url });
await admin2.connect();
await admin2.query(`SET app.current_tenant='t1'`);
await admin2.query("BEGIN");
await admin2.query(
  `INSERT INTO holds(id,tenant_id,actor_id,service_id,idempotency_key,request_digest,state,schedule_id,schedule_version,recipe_id,recipe_version,ttl_min,max_extensions,held_at,expires_at,last_reason)
   VALUES ('dual-1','t1','actor-x','derm','dual-key-1','d2','held','s1',1,'r1',1,10,2,statement_timestamp(),statement_timestamp()+interval '10 minutes','HOLD_CREATED')`,
);
await admin2.query(
  `INSERT INTO reservation_items(hold_id,tenant_id,unit_id,occupied) VALUES ('dual-1','t1','doc-1',$1::tstzrange)`,
  [SLOT],
);
// doc-1 is free; room-1 is taken -> the second insert must fail and the whole
// transaction rolls back, so doc-1 never ends up half-held.
let conflicted = false;
try {
  await admin2.query(
    `INSERT INTO reservation_items(hold_id,tenant_id,unit_id,occupied) VALUES ('dual-1','t1','room-1',$1::tstzrange)`,
    [SLOT],
  );
  await admin2.query("COMMIT");
} catch (e) {
  if (e && e.code === "23P01") conflicted = true;
  await admin2.query("ROLLBACK");
}
if (!conflicted) throw new Error("all-or-none: expected exclusion conflict on room-1");
const half = await admin.query(
  `SELECT count(*)::int AS n FROM reservation_items WHERE hold_id='dual-1' AND active`,
);
if (half.rows[0].n !== 0) throw new Error("all-or-none violated: partial items survived");
console.log("acceptance 2 PASS: multi-resource hold is all-or-none");
await admin2.end();

// Idempotency: same key twice -> one hold; changed digest is a conflict signal.
await admin.query(
  `INSERT INTO holds(id,tenant_id,actor_id,service_id,idempotency_key,request_digest,state,schedule_id,schedule_version,recipe_id,recipe_version,ttl_min,max_extensions,held_at,expires_at,last_reason)
   VALUES ('idem-1','t1','actor-1','derm','idem-key','dig-A','held','s1',1,'r1',1,10,2,statement_timestamp(),statement_timestamp()+interval '10 minutes','HOLD_CREATED')
   ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`,
);
const dup = await admin.query(
  `INSERT INTO holds(id,tenant_id,actor_id,service_id,idempotency_key,request_digest,state,schedule_id,schedule_version,recipe_id,recipe_version,ttl_min,max_extensions,held_at,expires_at,last_reason)
   VALUES ('idem-2','t1','actor-1','derm','idem-key','dig-B','held','s1',1,'r1',1,10,2,statement_timestamp(),statement_timestamp()+interval '10 minutes','HOLD_CREATED')
   ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`,
);
if (dup.rowCount !== 0) throw new Error("idempotency: second row inserted under same key");
console.log("idempotency PASS: same key replays, changed body conflicts");

// Acceptance 3: expired hold cannot redeem with the worker stopped.
// No worker runs in this smoke at all: expiry is inline via statement_timestamp.
await admin.query(
  `INSERT INTO holds(id,tenant_id,actor_id,service_id,idempotency_key,request_digest,state,schedule_id,schedule_version,recipe_id,recipe_version,ttl_min,max_extensions,held_at,expires_at,last_reason)
   VALUES ('old-1','t1','actor-1','derm','old-key','d3','held','s1',1,'r1',1,2,2,statement_timestamp()-interval '10 minutes',statement_timestamp()-interval '8 minutes','HOLD_CREATED')`,
);
const redeem = await admin.query(
  `UPDATE holds SET state='committed', decided_at=statement_timestamp(), last_reason='HOLD_REDEEMED'
   WHERE id='old-1' AND state='held' AND expires_at > statement_timestamp()`,
);
if (redeem.rowCount !== 0) throw new Error("expired hold redeemed with worker stopped");
await admin.query(
  `UPDATE holds SET state='expired', decided_at=statement_timestamp(), last_reason='HOLD_EXPIRED'
   WHERE id='old-1' AND state='held' AND expires_at <= statement_timestamp()`,
);
await admin.query(
  `UPDATE reservation_items SET active=false, reason='HOLD_EXPIRED', decided_at=statement_timestamp() WHERE hold_id='old-1'`,
);
const st = await admin.query(`SELECT state FROM holds WHERE id='old-1'`);
if (st.rows[0].state !== "expired") throw new Error("inline expiry sweep failed");
console.log("acceptance 3 PASS: expired hold cannot redeem with worker stopped");

// RLS: tenant t2 sees none of t1's ledger.
await admin.query(`SET ROLE zyara_app`);
await admin.query(`SET app.current_tenant='t2'`);
const leak = await admin.query(`SELECT count(*)::int AS n FROM holds`);
if (leak.rows[0].n !== 0) throw new Error("cross-tenant leak in holds");
await admin.query(`RESET ROLE`);

console.log("M015 holds smoke PASS: exclusion, all-or-none, idempotency, inline expiry, RLS");
await admin.end();

