import Fastify from "fastify";
import pkg from "pg";
const { Client } = pkg;
import { interpretReadiness } from "@zyara/domain";
import type { ReadyResponse } from "@zyara/contracts";

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
  app.get("/live", async () => ({ alive: true }));
  app.get("/ready", async (): Promise<ReadyResponse> => {
    const database = await checkDatabase();
    const status = interpretReadiness({ database });
    return { status, database, build: BUILD, version: VERSION };
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
