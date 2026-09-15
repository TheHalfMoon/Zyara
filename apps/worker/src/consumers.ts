import type { Consumer } from "@zyara/events";

// Scoped consumer registry (M004). Consumers declare codes + tenants;
// dispatch enforces tenant scoping so cross-tenant routing cannot leak.
export const consumers: Consumer[] = [
  {
    name: "audit-writer",
    codes: ["membership.changed", "op.committed", "op.conflicted"],
    tenants: [],
    handle: async () => "ack",
  },
  {
    name: "projection-invalidator",
    codes: ["projection.invalidated"],
    tenants: [],
    handle: async () => "ack",
  },
];

export function consumersFor(tenant: string): Consumer[] {
  return consumers.filter((c) => c.tenants.length === 0 || c.tenants.includes(tenant));
}
