// Zyara provider graph and identifier model (M006).
// Organization -> location/branch -> practitioner role -> service, with
// taxonomy + insurer assertions. Opaque IDs; effective dating; external
// namespaces preserved; history never destructively merged.
// Public vs private evidence fields are separated at the type level.

export type OpaqueId = string;

export interface Organization {
  id: OpaqueId;
  tenant: string;
  parentId: OpaqueId | null;
  labels: Record<string, string>;
}

export interface BranchLocation {
  id: OpaqueId;
  tenant: string;
  organizationId: OpaqueId;
  labels: Record<string, string>;
}

export interface Practitioner {
  id: OpaqueId;
  tenant: string;
  // One shared human identity; roles attach per branch without duplication.
  displayNames: Record<string, string>;
}

export interface PractitionerRole {
  id: OpaqueId;
  tenant: string;
  practitionerId: OpaqueId;
  branchId: OpaqueId;
  taxonomy: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface CareService {
  id: OpaqueId;
  tenant: string;
  branchId: OpaqueId;
  // A service may exist with NO primary doctor (no practitioner required).
  practitionerRoleId: OpaqueId | null;
  labels: Record<string, string>;
}

export interface InsurerAssertion {
  id: OpaqueId;
  tenant: string;
  serviceId: OpaqueId;
  insurer: string;
  network: string;
  branchId: OpaqueId;
  effectiveFrom: string;
  effectiveTo: string | null;
  // Provenance: source + observed time; unknown stays unknown.
  source: string;
  observedAt: string;
}

export interface ExternalIdentifier {
  namespace: string;
  value: string;
  entityId: OpaqueId;
}

export type GraphErrorCode =
  | "GRAPH_CROSS_TENANT"
  | "GRAPH_CYCLE"
  | "GRAPH_DUPLICATE_ID"
  | "GRAPH_UNKNOWN_REFERENCE"
  | "GRAPH_IDENTIFIER_REUSE";

export class GraphError extends Error {
  code: GraphErrorCode;
  constructor(code: GraphErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// Integrity counters (observability): failures + source coverage.
export interface GraphIntegrity {
  failures: Partial<Record<GraphErrorCode, number>>;
  sources: Record<string, number>;
}

export class GraphStore {
  organizations = new Map<OpaqueId, Organization>();
  branches = new Map<OpaqueId, BranchLocation>();
  practitioners = new Map<OpaqueId, Practitioner>();
  roles = new Map<OpaqueId, PractitionerRole>();
  services = new Map<OpaqueId, CareService>();
  assertions: InsurerAssertion[] = [];
  externalIds: ExternalIdentifier[] = [];
  integrity: GraphIntegrity = { failures: {}, sources: {} };

  private fail(code: GraphErrorCode, message: string): never {
    this.integrity.failures[code] = (this.integrity.failures[code] ?? 0) + 1;
    throw new GraphError(code, message);
  }

  private checkTenant(entityTenant: string, scopeTenant: string): void {
    if (entityTenant !== scopeTenant) this.fail("GRAPH_CROSS_TENANT", `cross-tenant write: ${entityTenant} != ${scopeTenant}`);
  }

  addOrganization(org: Organization): void {
    if (this.organizations.has(org.id)) this.fail("GRAPH_DUPLICATE_ID", `org ${org.id}`);
    // Cycle detection: walk parent chain; a repeat means a cycle.
    const seen = new Set<OpaqueId>([org.id]);
    let cursor: OpaqueId | null = org.parentId;
    while (cursor) {
      if (seen.has(cursor)) this.fail("GRAPH_CYCLE", `organization cycle at ${cursor}`);
      seen.add(cursor);
      cursor = this.organizations.get(cursor)?.parentId ?? null;
    }
    if (org.parentId && !this.organizations.has(org.parentId)) {
      this.fail("GRAPH_UNKNOWN_REFERENCE", `parent ${org.parentId}`);
    }
    this.organizations.set(org.id, org);
  }

  addBranch(branch: BranchLocation, scopeTenant: string): void {
    this.checkTenant(branch.tenant, scopeTenant);
    const org = this.organizations.get(branch.organizationId);
    if (!org) this.fail("GRAPH_UNKNOWN_REFERENCE", `org ${branch.organizationId}`);
    this.checkTenant(org.tenant, scopeTenant);
    this.branches.set(branch.id, branch);
  }

  addPractitioner(p: Practitioner, scopeTenant: string): void {
    this.checkTenant(p.tenant, scopeTenant);
    if (this.practitioners.has(p.id)) this.fail("GRAPH_DUPLICATE_ID", `practitioner ${p.id}`);
    this.practitioners.set(p.id, p);
  }

  addRole(role: PractitionerRole, scopeTenant: string): void {
    this.checkTenant(role.tenant, scopeTenant);
    const practitioner = this.practitioners.get(role.practitionerId);
    const branch = this.branches.get(role.branchId);
    if (!practitioner || !branch) this.fail("GRAPH_UNKNOWN_REFERENCE", `role ${role.id}`);
    this.checkTenant(practitioner.tenant, scopeTenant);
    this.checkTenant(branch.tenant, scopeTenant);
    this.roles.set(role.id, role);
  }

  addService(service: CareService, scopeTenant: string): void {
    this.checkTenant(service.tenant, scopeTenant);
    const branch = this.branches.get(service.branchId);
    if (!branch) this.fail("GRAPH_UNKNOWN_REFERENCE", `branch ${service.branchId}`);
    this.checkTenant(branch.tenant, scopeTenant);
    if (service.practitionerRoleId) {
      const role = this.roles.get(service.practitionerRoleId);
      if (!role) this.fail("GRAPH_UNKNOWN_REFERENCE", `role ${service.practitionerRoleId}`);
      this.checkTenant(role.tenant, scopeTenant);
    }
    this.services.set(service.id, service);
  }

  addInsurerAssertion(a: InsurerAssertion, scopeTenant: string): void {
    this.checkTenant(a.tenant, scopeTenant);
    if (!this.services.has(a.serviceId)) this.fail("GRAPH_UNKNOWN_REFERENCE", `service ${a.serviceId}`);
    this.assertions.push(a);
    this.integrity.sources[a.source] = (this.integrity.sources[a.source] ?? 0) + 1;
  }

  addExternalId(e: ExternalIdentifier): void {
    const clash = this.externalIds.find((x) => x.namespace === e.namespace && x.value === e.value && x.entityId !== e.entityId);
    // Reused external identifiers are quarantined, never destructively merged.
    if (clash) this.fail("GRAPH_IDENTIFIER_REUSE", `${e.namespace}:${e.value}`);
    this.externalIds.push(e);
  }

  rolesForPractitioner(practitionerId: OpaqueId): PractitionerRole[] {
    return [...this.roles.values()].filter((r) => r.practitionerId === practitionerId);
  }
}
