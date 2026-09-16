// Dental multi-resource service configuration (M046).
// Each dental service has a resource recipe: every listed resource must
// be held atomically for the visit. Partial holds roll back entirely.
// Qualification constraints bind services to clinician scopes
// (dentist-only surgical work; hygienists preventive only).
// Dental-preventive recall plans link to the matching service.

export type DentalService =
  | "checkup"
  | "cleaning"
  | "filling"
  | "extraction"
  | "root-canal";

export type ResourceKind = "chair" | "clinician" | "assistant" | "equipment";

export interface ResourceRequirement {
  kind: ResourceKind;
  qualifier: string;
}

export const DENTAL_RECIPES: Record<DentalService, ResourceRequirement[]> = {
  checkup: [
    { kind: "chair", qualifier: "dental-chair" },
    { kind: "clinician", qualifier: "dentist-or-hygienist" },
  ],
  cleaning: [
    { kind: "chair", qualifier: "dental-chair" },
    { kind: "clinician", qualifier: "dentist-or-hygienist" },
    { kind: "assistant", qualifier: "dental-assistant" },
  ],
  filling: [
    { kind: "chair", qualifier: "dental-chair" },
    { kind: "clinician", qualifier: "dentist" },
    { kind: "assistant", qualifier: "dental-assistant" },
    { kind: "equipment", qualifier: "restorative-kit" },
  ],
  extraction: [
    { kind: "chair", qualifier: "surgical-chair" },
    { kind: "clinician", qualifier: "dentist" },
    { kind: "assistant", qualifier: "dental-assistant" },
    { kind: "equipment", qualifier: "surgical-kit" },
  ],
  "root-canal": [
    { kind: "chair", qualifier: "surgical-chair" },
    { kind: "clinician", qualifier: "dentist-endodontist" },
    { kind: "assistant", qualifier: "dental-assistant" },
    { kind: "equipment", qualifier: "endo-kit" },
  ],
};

export type ClinicianScope = "dentist" | "dentist-endodontist" | "hygienist";

const SCOPE_COVERAGE: Record<DentalService, readonly ClinicianScope[]> = {
  checkup: ["dentist", "dentist-endodontist", "hygienist"],
  cleaning: ["dentist", "dentist-endodontist", "hygienist"],
  filling: ["dentist", "dentist-endodontist"],
  extraction: ["dentist", "dentist-endodontist"],
  "root-canal": ["dentist-endodontist"],
};

export function scopeAllowed(
  service: DentalService,
  scope: ClinicianScope,
): boolean {
  return SCOPE_COVERAGE[service].includes(scope);
}

export interface ResourceHold {
  kind: ResourceKind;
  qualifier: string;
  held: boolean;
}

export interface MultiHoldResult {
  ok: boolean;
  holds: ResourceHold[];
  rolledBack: boolean;
  reason: string;
}

/**
 * Atomic multi-resource hold: all recipe resources or none. Any missing
 * resource rolls the whole set back.
 */
export function holdAllResources(
  service: DentalService,
  available: ReadonlySet<string>,
): MultiHoldResult {
  const recipe = DENTAL_RECIPES[service];
  const holds: ResourceHold[] = recipe.map((r) => ({
    kind: r.kind,
    qualifier: r.qualifier,
    held: available.has(`${r.kind}:${r.qualifier}`),
  }));
  const missing = holds.filter((h) => !h.held);
  if (missing.length > 0) {
    return {
      ok: false,
      holds: holds.map((h) => ({ ...h, held: false })),
      rolledBack: true,
      reason: `Missing: ${missing.map((m) => `${m.kind}:${m.qualifier}`).join(",")}; all holds rolled back.`,
    };
  }
  return { ok: true, holds, rolledBack: false, reason: "All recipe resources held." };
}

export function recallTemplateFor(
  service: DentalService,
): "dental-preventive" | "follow-up" {
  return service === "checkup" || service === "cleaning"
    ? "dental-preventive"
    : "follow-up";
}
