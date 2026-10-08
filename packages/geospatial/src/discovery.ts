/**
 * GEO-03A: shared map/list discovery projection (pure, synthetic-first).
 * The same authorized result IDs feed the accessible list and map. A map
 * viewport does not change search results until Search this area is invoked.
 */
import type { BranchPin, MapListFilter } from "./index.js";

export type DiscoveryPublicStatus = "public" | "hidden" | "disputed";
export type DiscoveryLocationStatus = "precise" | "approximate" | "unknown";

export interface DiscoveryRecord {
  readonly branch: BranchPin;
  readonly publicStatus: DiscoveryPublicStatus;
  readonly locationStatus: DiscoveryLocationStatus;
  readonly specialties: readonly string[];
  readonly insurers: readonly string[];
  /** Stable relevance order from the authorized search service, not viewport. */
  readonly sourceRank: number;
}

export interface DiscoveryBounds {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}

export interface DiscoveryViewState {
  readonly selectedBranchId: string | null;
  readonly pendingViewport: DiscoveryBounds | null;
  readonly searchedViewport: DiscoveryBounds | null;
  readonly mapAvailable: boolean;
}

export interface DiscoveryListItem {
  readonly branchId: string;
  readonly label: string;
  readonly bookingMode: BranchPin["bookingMode"];
  readonly wheelchairAccess: boolean;
  readonly locationDisclosure: DiscoveryLocationStatus;
  readonly selected: boolean;
}

export interface DiscoveryMapPin {
  readonly branchId: string;
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM: number;
  readonly selected: boolean;
}

export interface DiscoveryCluster {
  readonly cell: string;
  readonly branchIds: readonly string[];
}

export interface DiscoveryProjection {
  readonly list: readonly DiscoveryListItem[];
  readonly pins: readonly DiscoveryMapPin[];
  readonly clusters: readonly DiscoveryCluster[];
  readonly selectedBranchId: string | null;
  readonly hasPendingAreaSearch: boolean;
  readonly mapAvailable: boolean;
  readonly suppressedPinIds: readonly string[];
}

export class DiscoveryContractError extends Error {
  constructor(readonly code: "DISCOVERY_DUPLICATE_ID" | "DISCOVERY_INVALID_INPUT", reason: string) {
    super(reason);
    this.name = "DiscoveryContractError";
  }
}

function coordinateValid(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function validateBounds(bounds: DiscoveryBounds): void {
  if (!coordinateValid(bounds.south, bounds.west) ||
      !coordinateValid(bounds.north, bounds.east) ||
      bounds.south > bounds.north || bounds.west > bounds.east) {
    throw new DiscoveryContractError("DISCOVERY_INVALID_INPUT", "invalid or antimeridian-crossing viewport");
  }
}

function sameBounds(a: DiscoveryBounds | null, b: DiscoveryBounds | null): boolean {
  if (!a || !b) return a === b;
  return a.west === b.west && a.south === b.south && a.east === b.east && a.north === b.north;
}

function inBounds(lat: number, lng: number, bounds: DiscoveryBounds): boolean {
  return lat >= bounds.south && lat <= bounds.north &&
    lng >= bounds.west && lng <= bounds.east;
}

/** Precise pins require public attestation and a verified <=100 m coordinate. */
function hasQualifiedPin(record: DiscoveryRecord): boolean {
  const { branch, locationStatus } = record;
  return locationStatus === "precise" &&
    branch.verifiedScope !== null && branch.accuracyM !== null &&
    Number.isFinite(branch.accuracyM) && branch.accuracyM >= 0 &&
    branch.accuracyM <= 100 && coordinateValid(branch.lat, branch.lng);
}

/** Distance for optional local filtering only; not a drive-time/route ETA. */
function straightLineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const hav = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(hav)));
}

export const INITIAL_DISCOVERY_VIEW: DiscoveryViewState = Object.freeze({
  selectedBranchId: null,
  pendingViewport: null,
  searchedViewport: null,
  mapAvailable: true,
});

export function proposeDiscoveryViewport(
  state: DiscoveryViewState,
  bounds: DiscoveryBounds,
): DiscoveryViewState {
  validateBounds(bounds);
  return { ...state, pendingViewport: { ...bounds } };
}

/** Only this explicit user action commits a panned map area to the results. */
export function searchDiscoveryArea(state: DiscoveryViewState): DiscoveryViewState {
  if (!state.pendingViewport) return state;
  return {
    ...state,
    searchedViewport: { ...state.pendingViewport },
    pendingViewport: null,
  };
}

export function selectDiscoveryBranch(
  state: DiscoveryViewState,
  branchId: string | null,
): DiscoveryViewState {
  if (branchId !== null && (!branchId.trim() || branchId.length > 128)) {
    throw new DiscoveryContractError("DISCOVERY_INVALID_INPUT", "invalid selected branch ID");
  }
  return { ...state, selectedBranchId: branchId };
}

export function setDiscoveryMapAvailable(state: DiscoveryViewState, available: boolean): DiscoveryViewState {
  return { ...state, mapAvailable: available };
}

/** Pure projection: neither a tile/geocoder call nor an availability claim. */
export function buildSharedDiscoveryProjection(
  records: readonly DiscoveryRecord[],
  filter: MapListFilter,
  state: DiscoveryViewState = INITIAL_DISCOVERY_VIEW,
  locale = "ar",
): DiscoveryProjection {
  const seen = new Set<string>();
  const publicRecords: DiscoveryRecord[] = [];
  for (const item of records) {
    const id = item.branch.branchId;
    if (typeof id !== "string" || !id.trim() ||
        !Number.isSafeInteger(item.sourceRank) || item.sourceRank < 0) {
      throw new DiscoveryContractError("DISCOVERY_INVALID_INPUT", "invalid result identity or source rank");
    }
    if (seen.has(id)) throw new DiscoveryContractError("DISCOVERY_DUPLICATE_ID", "duplicate result entity");
    seen.add(id);
    if (!["precise","approximate","unknown"].includes(item.locationStatus)) {
      throw new DiscoveryContractError("DISCOVERY_INVALID_INPUT", "invalid location disclosure");
    }
    if (item.publicStatus === "public") publicRecords.push(item);
    else if (item.publicStatus !== "hidden" && item.publicStatus !== "disputed") {
      throw new DiscoveryContractError("DISCOVERY_INVALID_INPUT", "invalid publication status");
    }
  }

  if (state.pendingViewport) validateBounds(state.pendingViewport);
  if (state.searchedViewport) validateBounds(state.searchedViewport);
  if (filter.near && (!coordinateValid(filter.near.lat, filter.near.lng) ||
      !Number.isFinite(filter.near.radiusKm) || filter.near.radiusKm <= 0 ||
      filter.near.radiusKm > 300)) {
    throw new DiscoveryContractError("DISCOVERY_INVALID_INPUT", "invalid optional local radius");
  }

  const selected = publicRecords
    .filter((record) => {
      const { branch, specialties, insurers, locationStatus } = record;
      if (filter.accessibleOnly && !branch.wheelchairAccess) return false;
      if (filter.specialty && !specialties.some(s=>s.toLocaleLowerCase()===filter.specialty?.toLocaleLowerCase())) return false;
      if (filter.insurer && !insurers.some(s=>s.toLocaleLowerCase()===filter.insurer?.toLocaleLowerCase())) return false;
      if (filter.near && (!hasQualifiedPin(record) ||
          straightLineKm(branch.lat,branch.lng,filter.near.lat,filter.near.lng)>filter.near.radiusKm)) return false;
      // An explicit viewport search can narrow mapped branches; branches with
      // unknown coordinates remain listed for their non-map access channel.
      if (state.searchedViewport && hasQualifiedPin(record) &&
          !inBounds(branch.lat,branch.lng,state.searchedViewport)) return false;
      return true;
    })
    .sort((a,b)=>a.sourceRank-b.sourceRank ||
      a.branch.branchId.localeCompare(b.branch.branchId,"en"));

  const selectedId = selected.some(x=>x.branch.branchId===state.selectedBranchId)
    ? state.selectedBranchId : null;

  const list: DiscoveryListItem[] = selected.map((record) => {
    const { branch, locationStatus } = record;
    const disclosure: DiscoveryLocationStatus =
      hasQualifiedPin(record) ? "precise" :
      locationStatus === "approximate" ? "approximate" : "unknown";
    return {
      branchId: branch.branchId,
      label: branch.labels[locale] ?? branch.labels.ar ?? branch.labels.en ?? branch.branchId,
      bookingMode: branch.bookingMode,
      wheelchairAccess: branch.wheelchairAccess,
      locationDisclosure: disclosure,
      selected: branch.branchId === selectedId,
    };
  });

  const pins: DiscoveryMapPin[] = [];
  const suppressedPinIds: string[] = [];
  for (const record of selected) {
    const { branch } = record;
    if (hasQualifiedPin(record)) {
      if (state.mapAvailable) pins.push({
        branchId:branch.branchId,
        lat:branch.lat,
        lng:branch.lng,
        accuracyM:branch.accuracyM,
        selected:branch.branchId===selectedId,
      });
    } else {
      suppressedPinIds.push(branch.branchId);
    }
  }

  const clustersByCell = new Map<string,string[]>();
  for (const pin of pins) {
    const cell = `${Math.floor(pin.lat * 20)}:${Math.floor(pin.lng * 20)}`;
    const current = clustersByCell.get(cell) ?? [];
    current.push(pin.branchId);
    clustersByCell.set(cell,current);
  }
  const clusters: DiscoveryCluster[] = [...clustersByCell.entries()]
    .filter(([,ids])=>ids.length>1)
    .sort(([a],[b])=>a.localeCompare(b,"en"))
    .map(([cell,ids])=>({cell,branchIds:ids}));

  return {
    list,
    pins,
    clusters,
    selectedBranchId:selectedId,
    hasPendingAreaSearch:!sameBounds(state.pendingViewport,state.searchedViewport) && state.pendingViewport!==null,
    mapAvailable:state.mapAvailable,
    suppressedPinIds,
  };
}
