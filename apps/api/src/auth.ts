import type { FastifyRequest } from "fastify";
import { SyntheticOidcProvider, authError } from "@zyara/identity";
import { authorize } from "@zyara/authorization";

export const oidc = new SyntheticOidcProvider();

function bearerToken(req: FastifyRequest): string {
  const h = req.headers.authorization ?? "";
  const m = h.match(/^Bearer (.+)$/);
  if (!m) throw authError("UNAUTHENTICATED", "en");
  return m[1];
}

// Tenant context derives ONLY from verified session claims.
export function requestTenant(req: FastifyRequest) {
  const token = bearerToken(req);
  const claims = oidc.verify(token, Math.floor(Date.now() / 1000));
  return { claims };
}

export { authorize };
