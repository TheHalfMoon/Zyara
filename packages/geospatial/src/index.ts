// Geospatial helpers (M012). MapLibre is a renderer, not a data-rights grant:
// tile/geocoding terms are qualified separately (see evidence). Coordinates
// with poor accuracy are suppressed, never shown as precise pins.

export interface BranchPin {
  branchId: string;
  lat: number;
  lng: number;
  accuracyM: number | null;
  labels: Record<string, string>;
  insurerCaveat: string | null;
  verifiedScope: string | null;
  observedAt: string;
  bookingMode: "instant" | "request" | "call" | "redirect" | "unavailable";
  wheelchairAccess: boolean;
}

export interface MapListFilter {
  near?: { lat: number; lng: number; radiusKm: number };
  specialty?: string;
  insurer?: string;
  accessibleOnly?: boolean;
  // Precise user location is OPTIONAL; coarse or no location still lists.
  userLocation?: { lat: number; lng: number } | null;
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  return Math.hypot(aLat - bLat, aLng - bLng) * 111;
}

// Single shared filter used by BOTH map and list -> parity by construction.
export function applyFilter(pins: BranchPin[], filter: MapListFilter): BranchPin[] {
  return pins.filter((p) => {
    if (filter.near && distanceKm(p.lat, p.lng, filter.near.lat, filter.near.lng) > filter.near.radiusKm) return false;
    if (filter.accessibleOnly && !p.wheelchairAccess) return false;
    return true;
  });
}

// Suppress inaccurate pins: accuracy unknown or worse than 100m hides the pin;
// the branch remains reachable via list/address fallback.
export function visiblePins(pins: BranchPin[]): { pins: BranchPin[]; suppressed: string[] } {
  const kept: BranchPin[] = [];
  const suppressed: string[] = [];
  for (const p of pins) {
    if (p.accuracyM === null || p.accuracyM > 100) suppressed.push(p.branchId);
    else kept.push(p);
  }
  return { pins: kept, suppressed };
}

// Minimized interaction events: distinct counts, no PHI, no coordinates.
export type DiscoveryEvent = "profile_view" | "directions_click" | "phone_click";

export function discoveryEvent(name: DiscoveryEvent, branchId: string): { event: DiscoveryEvent; branchId: string; at: string } {
  return { event: name, branchId, at: new Date().toISOString() };
}
