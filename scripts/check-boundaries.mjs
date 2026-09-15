// M001 import boundary check: apps/* may import @zyara/contracts and @zyara/domain;
// packages/domain must not import apps, UI, framework, or application code.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN_IN_DOMAIN = [
  "next", "react", "fastify", "apps/", "@zyara/api", "@zyara/web",
  "@zyara/worker", "pg", "openai", "keycloak",
];

function collect(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (e === "node_modules" || e === "dist" || e === ".next") continue;
    const s = statSync(p);
    if (s.isDirectory()) collect(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(e)) out.push(p);
  }
  return out;
}

let failures = [];
for (const f of collect(join(ROOT, "packages/domain/src"))) {
  const content = readFileSync(f, "utf8");
  for (const token of FORBIDDEN_IN_DOMAIN) {
    const re = new RegExp(`(from\\s+['"][^'"]*${token.replace(/\//g, "\\/")}|require\\(['"][^'"]*${token.replace(/\//g, "\\/")}|import\\(['"]${token.replace(/\//g, "\\/")})`);
    if (re.test(content)) failures.push(`${f}: forbidden import '${token}'`);
  }
}
// apps must not import each other directly
for (const app of ["apps/api/src", "apps/web/app", "apps/worker/src"]) {
  try {
    for (const f of collect(join(ROOT, app))) {
      const content = readFileSync(f, "utf8");
      if (/@zyara\/(api|web|worker)/.test(content)) failures.push(`${f}: app-to-app import forbidden`);
    }
  } catch {}
}
if (failures.length) {
  console.error("Boundary check FAILED:");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log("Boundary check passed.");

