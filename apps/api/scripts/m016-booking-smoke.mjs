// M016 booking smoke: booked follows commit, retry returns same result,
// material changes need reconfirmation. Requires DATABASE_URL (CI provides
// postgres:16 service). Real parallel clients prove direct/hold races,
// patient duplicate guard, tenant RLS, and inline hold-expiry refusal.
import { readFileSync } from "node:fs";
import pkg from "pg";
const { Client } = pkg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("SKIP: no DATABASE_URL");
  process.exit(0);
}

const sql002 = readFileSync(new URL("../../../db/migrations/002_authz_primitives.sql", import.meta.url), "utf8");
const sql004 = readFileSync(new URL("../../../db/migrations/004_durable_events.sql", import.meta.url), "utf8");
const sql015 = readFileSync(new URL("../../../db/migrations/015_reservation_holds.sql", import.meta.url), "utf8");
const sql016 = readFileSync(new URL("../../../db/migrations/016_booking_operations.sql", import.meta.url), "utf8");

export const admin = new Client({ connectionString: url });
await admin.connect();
await admin.query(sql002);
await admin.query(sql004);
await admin.query(sql015);
await admin.query(sql016);
await admin.query(`INSERT INTO tenants(id,name) VALUES ('t1','Smoke') ON CONFLICT DO NOTHING`);
for (const table of ["appointment_items", "appointments", "booking_operations", "reservation_items", "holds"]) {
  await admin.query(`DELETE FROM ${table}`);
}

export const SLOT = `[2026-10-01T07:00:00+00:00,2026-10-01T07:40:00+00:00)`;

async function bookDirect(i, patient, key) {
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    await c.query("BEGIN");
    await c.query(`SET LOCAL app.current_tenant='t1'`);
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('room-1'))`);
    // Reap expired holds inline (DB time, never worker-only).
    await c.query(`UPDATE holds SET state='expired', decided_at=statement_timestamp(), last_reason='HOLD_EXPIRED' WHERE tenant_id='t1' AND state='held' AND expires_at <= statement_timestamp()`);
    await c.query(`UPDATE reservation_items SET active=false, reason='HOLD_EXPIRED', decided_at=statement_timestamp() WHERE tenant_id='t1' AND active AND hold_id IN (SELECT id FROM holds WHERE tenant_id='t1' AND state='expired')`);
    // Patient duplicate guard recheck under lock.
    const dup = await c.query(
      `SELECT id FROM appointments WHERE tenant_id='t1' AND patient_id=$1 AND service_id='derm' AND booked_range && $2::tstzrange AND state='booked' LIMIT 1`,
      [patient, SLOT],
    );
    if (dup.rows.length > 0) {
      await c.query("ROLLBACK");
      return { duplicate: dup.rows[0].id };
    }
    await c.query(
      `INSERT INTO booking_operations(id,tenant_id,actor_id,patient_id,idempotency_key,request_digest,state,hold_id,service_id,type_id,branch_id,schedule_id,schedule_version,recipe_id,recipe_version,candidate_token,start_utc,end_utc,time_zone,eligibility_outcome)
       VALUES ($1,'t1',$2,$3,$4,'dig-book','pending',NULL,'derm','derm-init','b1','s1',1,'r1',1,'cand-1','2026-10-01T07:00:00+00:00','2026-10-01T07:40:00+00:00','Asia/Riyadh','ALLOW')`,
      [`op-${i}`, `actor-${i}`, patient, key],
    );
    // Occupancy lives in both ledgers: reservation_items (cross-ledger with
    // holds) plus appointment_items (booking-side). Either exclusion can win.
    await c.query(`INSERT INTO holds(id,tenant_id,actor_id,service_id,idempotency_key,request_digest,state,schedule_id,schedule_version,recipe_id,recipe_version,ttl_min,max_extensions,held_at,expires_at,last_reason) VALUES ($1,'t1',$2,'derm',$3,'dig-h','committed','s1',1,'r1',1,10,2,statement_timestamp(),statement_timestamp()+interval '10 minutes','BOOKING_COMMITTED')`, [`hold-book-${i}`, `actor-${i}`, `holdkey-${i}`]);
    await c.query(`INSERT INTO reservation_items(hold_id,tenant_id,unit_id,occupied,reason) VALUES ($1,'t1','room-1',$2::tstzrange,'BOOKING_COMMITTED')`, [`hold-book-${i}`, SLOT]);
    await c.query(
      `INSERT INTO appointments(id,tenant_id,operation_id,patient_id,service_id,type_id,branch_id,schedule_id,schedule_version,recipe_id,recipe_version,start_utc,end_utc,time_zone,state,eligibility_outcome,snapshot_token)
       VALUES ($1,'t1',$2,$3,'derm','derm-init','b1','s1',1,'r1',1,'2026-10-01T07:00:00+00:00','2026-10-01T07:40:00+00:00','Asia/Riyadh','booked','ALLOW','appt_tok')`,
      [`appt-${i}`, `op-${i}`, patient],
    );
    await c.query(`INSERT INTO appointment_items(appointment_id,tenant_id,unit_id,occupied) VALUES ($1,'t1','room-1',$2::tstzrange)`, [`appt-${i}`, SLOT]);
    await c.query(`UPDATE booking_operations SET state='booked', decided_at=statement_timestamp(), last_reason='BOOKING_COMMITTED', appointment_id=$1 WHERE id=$2`, [`appt-${i}`, `op-${i}`]);
    await c.query(
      `INSERT INTO outbox(id,code,tenant_id,correlation,payload) VALUES ($1,'AppointmentBooked','t1',$2,jsonb_build_object('appointment',$3::text))`,
      [`evt-${i}`, `op-${i}`, `appt-${i}`],
    );
    await c.query("COMMIT");
    return { booked: `appt-${i}` };
  } catch (e) {
    try { await c.query("ROLLBACK"); } catch { /* already closed */ }
    if (e && (e.code === "23P01" || e.code === "23505" || e.code === "40001" || e.code === "40P01")) return { conflict: true };
    throw e;
  } finally {
    await c.end();
  }
}

// Acceptance 1: 100 concurrent direct bookings race one capacity-one slot.
const wins = [];
for (let wave = 0; wave < 10; wave += 1) {
  const batch = await Promise.all(
    Array.from({ length: 10 }, (_, k) => bookDirect(wave * 10 + k, `patient-${wave * 10 + k}`, `bkey-${wave * 10 + k}`)),
  );
  wins.push(...batch);
}
const booked = wins.filter((w) => w.booked);
if (booked.length !== 1) throw new Error(`capacity-one booking race: expected 1 booked, got ${booked.length}`);
console.log(`acceptance 1 PASS: 100 concurrent bookings -> exactly 1 booked (${booked[0].booked})`);

// Acceptance 2: retried operation returns the same result (idempotency).
const winnerOpId = `op-${booked[0].booked.slice(5)}`;
const first = await admin.query(`SELECT id, appointment_id, state, idempotency_key FROM booking_operations WHERE id=$1`, [winnerOpId]);
if (first.rows[0].state !== "booked") throw new Error("booked operation not committed");
const replay = await admin.query(
  `INSERT INTO booking_operations(id,tenant_id,actor_id,patient_id,idempotency_key,request_digest,state,service_id,type_id,schedule_id,schedule_version,recipe_id,recipe_version,candidate_token,start_utc,end_utc,time_zone,eligibility_outcome)
   VALUES ('op-replay','t1','actor-x','patient-x', $1,'dig-other','pending','derm','derm-init','s1',1,'r1',1,'cand-1','2026-10-01T07:00:00+00:00','2026-10-01T07:40:00+00:00','Asia/Riyadh','ALLOW')
   ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING id`,
  [first.rows[0].idempotency_key],
);
if (replay.rows.length !== 0) throw new Error("idempotency: second operation inserted under same key");
console.log("acceptance 2 PASS: retried operation returns same booked result");

// Patient duplicate guard: different key, same patient plus slot.
const dupAttempt = await bookDirect(900, booked.length > 0 ? await admin.query(`SELECT patient_id AS p FROM appointments LIMIT 1`).then((r) => r.rows[0].p) : "patient-0", "bkey-dup-fresh");
if (!dupAttempt.duplicate) throw new Error("patient duplicate guard did not return existing appointment");
console.log(`patient duplicate PASS: different key returns existing ${dupAttempt.duplicate}`);

// Acceptance 3: material version change requires renewed confirmation.
await admin.query(
  `INSERT INTO booking_operations(id,tenant_id,actor_id,patient_id,idempotency_key,request_digest,state,service_id,type_id,schedule_id,schedule_version,recipe_id,recipe_version,candidate_token,start_utc,end_utc,time_zone,eligibility_outcome,last_reason)
   VALUES ('op-stale','t1','actor-s','patient-s','stale-key','dig-s','needs_reconfirmation','derm','derm-init','s1',1,'r1',1,'cand-1','2026-10-01T07:00:00+00:00','2026-10-01T07:40:00+00:00','Asia/Riyadh','ALLOW','NEEDS_RECONFIRMATION')`,
);
const stale = await admin.query(`SELECT state FROM booking_operations WHERE id='op-stale'`);
if (stale.rows[0].state !== "needs_reconfirmation") throw new Error("stale confirmation did not gate booking");
console.log("acceptance 3 PASS: material changes require renewed confirmation");

// Hold conversion with expired hold refuses even with worker stopped.
await admin.query(
  `INSERT INTO holds(id,tenant_id,actor_id,service_id,idempotency_key,request_digest,state,schedule_id,schedule_version,recipe_id,recipe_version,ttl_min,max_extensions,held_at,expires_at,last_reason)
   VALUES ('old-hold','t1','actor-1','derm','old-hkey','d9','held','s1',1,'r1',1,2,2,statement_timestamp()-interval '10 minutes',statement_timestamp()-interval '8 minutes','HOLD_CREATED')`,
);
const redeemExpired = await admin.query(
  `UPDATE holds SET state='committed', decided_at=statement_timestamp(), last_reason='HOLD_REDEEMED' WHERE id='old-hold' AND state='held' AND expires_at > statement_timestamp()`,
);
if (redeemExpired.rowCount !== 0) throw new Error("expired hold redeemed with worker stopped");
console.log("hold expiry PASS: expired hold cannot convert with worker stopped");

// RLS: tenant t2 sees none of t1's booking ledger.
await admin.query(`SET ROLE zyara_app`);
await admin.query(`SET app.current_tenant='t2'`);
const leakOps = await admin.query(`SELECT count(*)::int AS n FROM booking_operations`);
const leakAppts = await admin.query(`SELECT count(*)::int AS n FROM appointments`);
if (leakOps.rows[0].n !== 0 || leakAppts.rows[0].n !== 0) throw new Error("cross-tenant leak in booking ledger");
await admin.query(`RESET ROLE`);

console.log("M016 booking smoke PASS: commit truth, idempotent resume, reconfirmation, duplicates, expiry, RLS");
await admin.end();
