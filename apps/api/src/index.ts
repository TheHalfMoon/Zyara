import Fastify from "fastify";
import pkg from "pg";
const { Client } = pkg;
import { interpretReadiness } from "@zyara/domain";
import type { ReadyResponse } from "@zyara/contracts";
import { requestTenant, authorize, oidc } from "./auth.js";
import { registerVerifyRoutes } from "./verify.js";
import { registerSearchRoutes } from "./search.js";
import { registerBookingRoutes } from "./bookings.js";
import { registerWorkforceRoutes } from "./workforce.js";
import { registerCoverageRoutes } from "./coverage.js";
import { registerTaskRoutes } from "./tasks.js";
import { registerWhatsAppRoutes } from "./whatsapp.js";
import { authError } from "@zyara/identity";

const BUILD = process.env.ZYARA_BUILD ?? "m001-dev";
const VERSION = "0.1.0";
const PORT = Number(process.env.API_PORT ?? 4100);

async function checkDatabase(): Promise<"reachable" | "unavailable"> {
  const client = new Client({
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5433),
    user: process.env.PGUSER ?? "zyara_dev",
    password: process.env.PGPASSWORD ?? "zyara_dev_only",
    database: process.env.PGDATABASE ?? "zyara_dev",
    connectionTimeoutMillis: 1500,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return "reachable";
  } catch {
    return "unavailable";
  } finally {
    await client.end().catch(() => undefined);
  }
}

export function buildServer() {
  const app = Fastify({ logger: false });
  registerVerifyRoutes(app);
  registerSearchRoutes(app);
  registerBookingRoutes(app);
  registerWorkforceRoutes(app);
  registerCoverageRoutes(app);
  registerTaskRoutes(app);
  registerWhatsAppRoutes(app);
  app.get("/live", async () => ({ alive: true }));
  app.get("/ready", async (): Promise<ReadyResponse> => {
    const database = await checkDatabase();
    const status = interpretReadiness({ database });
    return { status, database, build: BUILD, version: VERSION };
  });
  // M002: tenant-scoped identity probe. Tenant comes from verified
  // session claims only; body-supplied tenant IDs are ignored.
  app.get("/me", async (req) => {    try {
      const { claims } = requestTenant(req);
      return { sub: claims.sub, tenant: claims.tenant, assurance: claims.assurance };
    } catch (err) {
      const code = (err as { code?: string }).code ?? "UNAUTHENTICATED";
      return { error: code };
    }
  });
  // M002: privileged provider/admin action requiring MFA assurance.
  app.post("/admin/privileged", async (req, reply) => {
    try {
      const { claims } = requestTenant(req);
      const body = (req.body ?? {}) as { tenant?: string; branch?: string };
      // Deliberately ignore body.tenant: authority is claims.tenant.
      const decision = authorize(
        { claims, memberships: [{ accountId: claims.sub, tenantId: claims.tenant, branchId: body.branch ?? null, role: "branch_admin", revoked: false, patientId: null }] },
        { action: "admin.privileged", resourceTenant: claims.tenant, resourceBranch: body.branch ?? undefined, requireAssurance: "aal2" },
      );
      if (!decision.allow) {
        void oidc;
        return reply.code(403).send({ error: decision.denial });
      }
      return { ok: true };
    } catch {
      return reply.code(401).send({ error: authError("UNAUTHENTICATED", "en").code });
    }
  });
  return app;
}

const invokedAsMain = process.argv.slice(1).some((a) => a.endsWith("apps/api/src/index.ts") || a.endsWith("apps\\api\\src\\index.ts") || a === "src/index.ts");
if (invokedAsMain) {
  const app = buildServer();
  app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
    console.log(`api listening on ${PORT}`);
  });
}
