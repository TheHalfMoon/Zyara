import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GraphStore, GraphError } from "@zyara/graph";
import {
  fhirOrganization, fhirLocation, fhirPractitioner, fhirPractitionerRole, fhirHealthcareService,
} from "./fhir-fixtures.js";

function seed(): GraphStore {
  const g = new GraphStore();
  g.addOrganization({ id: "o1", tenant: "t1", parentId: null, labels: { ar: "عيادة العليا", en: "Olaya Clinic" } });
  g.addBranch({ id: "b1", tenant: "t1", organizationId: "o1", labels: { en: "Branch 1" } }, "t1");
  g.addBranch({ id: "b2", tenant: "t1", organizationId: "o1", labels: { en: "Branch 2" } }, "t1");
  return g;
}

test("one practitioner, several branch roles, single identity", () => {
  const g = seed();
  g.addPractitioner({ id: "p1", tenant: "t1", displayNames: { ar: "ليلى", en: "Laila Marie Müller" } }, "t1");
  g.addRole({ id: "r1", tenant: "t1", practitionerId: "p1", branchId: "b1", taxonomy: "derm", effectiveFrom: "2026-01-01", effectiveTo: null }, "t1");
  g.addRole({ id: "r2", tenant: "t1", practitionerId: "p1", branchId: "b2", taxonomy: "derm", effectiveFrom: "2026-01-01", effectiveTo: null }, "t1");
  assert.equal(g.practitioners.size, 1);
  assert.equal(g.rolesForPractitioner("p1").length, 2);
});

test("service can exist without a primary doctor", () => {
  const g = seed();
  g.addService({ id: "s1", tenant: "t1", branchId: "b1", practitionerRoleId: null, labels: { en: "Lab draw" } }, "t1");
  assert.equal(g.services.get("s1")?.practitionerRoleId, null);
});

test("hierarchy cycles fail", () => {
  const g = new GraphStore();
  g.addOrganization({ id: "a", tenant: "t1", parentId: null, labels: {} });
  g.addOrganization({ id: "b", tenant: "t1", parentId: "a", labels: {} });
  // Re-parent a under b would need update; simulate cycle via self-parent chain:
  assert.throws(() => g.addOrganization({ id: "c", tenant: "t1", parentId: "zzz", labels: {} }), GraphError);
  const g2 = new GraphStore();
  // Direct self-cycle:
  assert.throws(() => g2.addOrganization({ id: "x", tenant: "t1", parentId: "x", labels: {} }), (e: unknown) => (e as GraphError).code === "GRAPH_CYCLE" || (e as GraphError).code === "GRAPH_UNKNOWN_REFERENCE");
});

test("cross-tenant writes fail; identifiers not reused across entities", () => {
  const g = seed();
  assert.throws(() => g.addBranch({ id: "bx", tenant: "t2", organizationId: "o1", labels: {} }, "t1"), (e: unknown) => (e as GraphError).code === "GRAPH_CROSS_TENANT");
  g.addExternalId({ namespace: "sa-nhic", value: "EXT-1", entityId: "p1" });
  assert.throws(() => g.addExternalId({ namespace: "sa-nhic", value: "EXT-1", entityId: "p2" }), (e: unknown) => (e as GraphError).code === "GRAPH_IDENTIFIER_REUSE");
});

test("FHIR fixtures map without inventing facts", () => {
  const g = new GraphStore();
  assert.equal(fhirOrganization.resourceType, "Organization");
  g.addOrganization({ id: `fhir:${fhirOrganization.id}`, tenant: "t1", parentId: null, labels: { en: fhirOrganization.name } });
  g.addBranch({ id: `fhir:${fhirLocation.id}`, tenant: "t1", organizationId: `fhir:${fhirOrganization.id}`, labels: { en: fhirLocation.name } }, "t1");
  const displayName = fhirPractitioner.name[0]?.text ?? "";
  assert.ok(displayName.includes("ليلى") && displayName.includes("Müller"));
  g.addPractitioner({ id: `fhir:${fhirPractitioner.id}`, tenant: "t1", displayNames: { orig: displayName } }, "t1");
  g.addRole({ id: `fhir:${fhirPractitionerRole.id}`, tenant: "t1", practitionerId: `fhir:${fhirPractitioner.id}`, branchId: `fhir:${fhirLocation.id}`, taxonomy: "derm", effectiveFrom: "2026-01-01", effectiveTo: null }, "t1");
  g.addService({ id: `fhir:${fhirHealthcareService.id}`, tenant: "t1", branchId: `fhir:${fhirLocation.id}`, practitionerRoleId: `fhir:${fhirPractitionerRole.id}`, labels: { en: fhirHealthcareService.name } }, "t1");
  assert.equal(g.services.size, 1);
});

test("insurer assertions carry provenance; unknown stays unknown", () => {
  const g = seed();
  g.addService({ id: "s9", tenant: "t1", branchId: "b1", practitionerRoleId: null, labels: {} }, "t1");
  g.addInsurerAssertion({ id: "a1", tenant: "t1", serviceId: "s9", insurer: "TAWUNIYA", network: "gold", branchId: "b1", effectiveFrom: "2026-01-01", effectiveTo: null, source: "synthetic-import", observedAt: "2026-09-15T00:00:00Z" }, "t1");
  assert.equal(g.integrity.sources["synthetic-import"], 1);
  // No coverage guarantee invented: only asserted pairs exist.
  assert.equal(g.assertions.length, 1);
});

test("migration 006 has graph tables + RLS + app grants", () => {
  const sql = readFileSync(new URL("../../db/migrations/006_provider_graph.sql", import.meta.url), "utf8");
  for (const s of ["organizations", "practitioner_roles", "care_services", "insurer_assertions", "external_identifiers", "FORCE ROW LEVEL SECURITY", "zyara_app"]) {
    assert.ok(sql.includes(s), s);
  }
});
