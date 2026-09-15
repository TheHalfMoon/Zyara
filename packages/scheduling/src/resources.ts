// Versioned resource recipes (M013).
// A recipe names the finite capacity units a service/type needs and the
// qualifications each slot requires. Qualifications are typed codes, never
// free text. Substitutions are allowed only when the recipe marks the slot
// substitutable AND the candidate unit has the right kind AND a superset of
// the required qualifications. Anything else is rejected explicitly.
// Recipes are immutable versions: publish appends a frozen version.

export type ResourceKind =
  | "practitioner"
  | "practitioner_role"
  | "nurse"
  | "technician"
  | "dentist"
  | "hygienist"
  | "assistant"
  | "chair"
  | "room"
  | "modality"
  | "imaging_equipment"
  | "lab_collection"
  | "telehealth_capacity"
  | "home_team"
  | "vehicle"
  | "shared";

export interface ResourceUnit {
  id: string;
  kind: ResourceKind;
  /** Typed qualification codes, e.g. "DENTAL_CLEANING". Never free text. */
  qualifications: string[];
  /** Finite capacity of this unit for one appointment (usually 1). */
  capacity: number;
  active: boolean;
}

export interface RecipeItem {
  /** Slot name, e.g. "clinician", "chair". */
  slot: string;
  kindsAllowed: ResourceKind[];
  requiredQualifications: string[];
  quantity: number;
  substitutable: boolean;
  durationMin: number;
}

export interface ResourceRecipe {
  id: string;
  serviceId: string;
  typeId: string;
  version: number;
  /** Total appointment minutes this recipe delivers. */
  durationMin: number;
  items: RecipeItem[];
}

export type RecipeMatchCode =
  | "MATCH_OK"
  | "INSUFFICIENT_CAPACITY"
  | "UNQUALIFIED_SUBSTITUTION"
  | "KIND_NOT_ALLOWED"
  | "DURATION_MISMATCH"
  | "UNIT_INACTIVE";

export interface RecipeAssignment {
  slot: string;
  unitIds: string[];
  /** Qualifications the assigned units actually carry (superset proof). */
  qualifications: string[][];
}

export interface RecipeMatch {
  code: RecipeMatchCode;
  assignments: RecipeAssignment[];
}

export function qualifies(unit: ResourceUnit, item: RecipeItem): boolean {
  if (!item.kindsAllowed.includes(unit.kind)) return false;
  return item.requiredQualifications.every((q) => unit.qualifications.includes(q));
}

/**
 * Match candidate units against a recipe. Deterministic over sorted unit IDs.
 * Failure codes distinguish genuine shortage from unsafe substitution:
 * UNQUALIFIED_SUBSTITUTION means a same-kind unit lacks a required
 * qualification; KIND_NOT_ALLOWED means a wrong-kind unit carries the
 * qualifications (an attempted kind substitution); otherwise a shortage is
 * INSUFFICIENT_CAPACITY. Irrelevant wrong-kind units without the required
 * qualifications never flip a shortage into a substitution error.
 * Substitutability selects *which* qualified unit fills the slot; it never
 * waives qualifications.
 */
export function matchRecipe(recipe: ResourceRecipe, candidates: ResourceUnit[]): RecipeMatch {
  if (recipe.durationMin <= 0) return { code: "DURATION_MISMATCH", assignments: [] };
  for (const item of recipe.items) {
    if (item.durationMin !== recipe.durationMin) return { code: "DURATION_MISMATCH", assignments: [] };
    if (item.quantity <= 0) return { code: "INSUFFICIENT_CAPACITY", assignments: [] };
  }
  const byId = [...candidates].sort((a, b) => (a.id < b.id ? -1 : 1));
  const used = new Set<string>();
  const assignments: RecipeAssignment[] = [];
  for (const item of recipe.items) {
    const picked: ResourceUnit[] = [];
    for (const unit of byId) {
      if (picked.length >= item.quantity) break;
      if (used.has(unit.id) || !unit.active) continue;
      if (qualifies(unit, item)) {
        picked.push(unit);
        used.add(unit.id);
      }
    }
    if (picked.length < item.quantity) {
      // Classify the failure precisely. Same-kind units lacking a required
      // qualification are attempted unqualified substitutions. A wrong-kind
      // unit that CARRIES the qualifications is an attempted kind
      // substitution. Anything else (including wrong-kind units that also
      // lack the qualifications) is a genuine shortage, never a false
      // substitution error.
      const unused = byId.filter((u) => !used.has(u.id));
      const kindMatch = (u: ResourceUnit): boolean => item.kindsAllowed.includes(u.kind);
      const qualsOk = (u: ResourceUnit): boolean =>
        item.requiredQualifications.every((q) => u.qualifications.includes(q));
      if (unused.some((u) => !u.active && kindMatch(u))) return { code: "UNIT_INACTIVE", assignments: [] };
      if (unused.some((u) => kindMatch(u) && u.active && !qualsOk(u))) {
        return { code: "UNQUALIFIED_SUBSTITUTION", assignments: [] };
      }
      if (unused.some((u) => !kindMatch(u) && qualsOk(u))) return { code: "KIND_NOT_ALLOWED", assignments: [] };
      if (unused.some((u) => !u.active)) return { code: "UNIT_INACTIVE", assignments: [] };
      return { code: "INSUFFICIENT_CAPACITY", assignments: [] };
    }
    if (!item.substitutable && picked.some((u) => !item.kindsAllowed.slice(0, 1).includes(u.kind))) {
      return { code: "KIND_NOT_ALLOWED", assignments: [] };
    }
    assignments.push({
      slot: item.slot,
      unitIds: picked.map((u) => u.id),
      qualifications: picked.map((u) => [...u.qualifications].sort()),
    });
  }
  return { code: "MATCH_OK", assignments };
}

// Immutable recipe registry: publish appends a frozen new version.
export class RecipeRegistry {
  private history = new Map<string, ResourceRecipe[]>();

  publish(draft: Omit<ResourceRecipe, "version">): ResourceRecipe {
    if (draft.durationMin <= 0) throw new Error("RECIPE_DURATION_INVALID");
    for (const item of draft.items) {
      if (item.durationMin !== draft.durationMin) throw new Error("RECIPE_ITEM_DURATION_MISMATCH");
      if (item.quantity <= 0) throw new Error("RECIPE_QUANTITY_INVALID");
      for (const q of item.requiredQualifications) {
        if (typeof q !== "string" || q.trim() === "" || q.length > 80) throw new Error("QUALIFICATION_CODE_INVALID");
      }
    }
    const prior = this.history.get(draft.id) ?? [];
    const versioned: ResourceRecipe = Object.freeze({
      ...draft,
      items: Object.freeze(draft.items.map((i) => Object.freeze({ ...i }))),
    } as ResourceRecipe);
    const withVersion = Object.freeze({ ...versioned, version: prior.length + 1 });
    this.history.set(draft.id, [...prior, withVersion]);
    return withVersion;
  }

  versions(id: string): readonly ResourceRecipe[] {
    return this.history.get(id) ?? [];
  }

  latest(id: string): ResourceRecipe | null {
    const list = this.history.get(id);
    return list && list.length > 0 ? (list[list.length - 1] as ResourceRecipe) : null;
  }
}
