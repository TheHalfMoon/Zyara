/**
 * GEO-02B: provider-neutral basemap admission, without a live provider.
 *
 * This module never makes a network request. Any future HTTP/MapLibre adapter
 * must check every asset URL (including redirects) through the same policy.
 * Public map view is not patient location or care intent.
 */
export type BasemapAssetKind = "style" | "tile" | "glyph" | "sprite" | "asset";
export type BasemapAdmission = "disabled" | "development_only" | "admitted";
export type BasemapHealth = "unknown" | "healthy" | "degraded" | "unavailable";
export type BasemapUnavailableReason =
  | "disabled" | "development-only" | "not-admitted" | "provider-unavailable"
  | "provider-unhealthy" | "request-budget-exhausted";

export interface BasemapDescriptor {
  readonly id: string;
  readonly providerId: string;
  readonly admission: BasemapAdmission;
  readonly style: {
    readonly url: string;
    readonly version: string;
    readonly sha256: string;
    readonly immutable: boolean;
  };
  readonly tileVersion: string;
  readonly origins: Readonly<Record<BasemapAssetKind, readonly string[]>>;
  readonly attribution: {
    readonly label: string;
    readonly licenseUrls: readonly string[];
  };
  readonly policy: {
    readonly termsUrl: string;
    readonly privacyUrl: string;
    readonly retentionReview: string;
    readonly maxRequestsPerView: number;
    readonly timeoutMs: number;
    readonly maxCacheAgeSeconds: number;
    readonly egress: "public_area_only";
  };
}

export type BasemapContractErrorCode =
  | "BASEMAP_DESCRIPTOR_INVALID" | "BASEMAP_PROVIDER_DISABLED"
  | "BASEMAP_NOT_ADMITTED" | "BASEMAP_PROVIDER_UNAVAILABLE"
  | "BASEMAP_ORIGIN_DENIED" | "BASEMAP_REQUEST_INVALID"
  | "BASEMAP_REQUEST_BUDGET_EXCEEDED" | "BASEMAP_STYLE_UNVERIFIED";

export class BasemapContractError extends Error {
  constructor(readonly code: BasemapContractErrorCode, message: string) {
    super(message);
    this.name = "BasemapContractError";
  }
}

function deny(code: BasemapContractErrorCode, reason: string): never {
  throw new BasemapContractError(code, reason);
}

function nonblank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function verifiedHttpsUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return deny("BASEMAP_REQUEST_INVALID", "malformed basemap URL");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password ||
      parsed.hash || parsed.search || /%0[ad]/i.test(value)) {
    return deny("BASEMAP_REQUEST_INVALID", "basemap URLs must be clean HTTPS URLs");
  }
  // Wildcards, numeric hosts and local/private host aliases cannot be
  // admitted by an origin policy, even if the URL parser accepts them.
  const host = parsed.hostname;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(host) ||
      /^\d+(?:\.\d+){3}$/.test(host) ||
      host.endsWith(".local") || host.endsWith(".internal") ||
      host.endsWith(".localhost")) {
    return deny("BASEMAP_REQUEST_INVALID", "explicit public DNS host required");
  }
  return parsed;
}

function exactOrigin(value: string): string {
  const parsed = verifiedHttpsUrl(value);
  if (parsed.origin !== value || parsed.pathname !== "/") {
    // URL.origin excludes the ending slash, so accepted input is just scheme+host.
    if (parsed.origin !== value) deny("BASEMAP_DESCRIPTOR_INVALID", "origin must be exact without path");
  }
  if (parsed.origin !== value) deny("BASEMAP_DESCRIPTOR_INVALID", "origin must have no path or query");
  return parsed.origin;
}

function checkDescriptor(descriptor: BasemapDescriptor): void {
  if (!descriptor || !/^[a-z][a-z0-9-]{2,63}$/.test(descriptor.id) ||
      !/^[a-z][a-z0-9-]{2,63}$/.test(descriptor.providerId) ||
      !["disabled", "development_only", "admitted"].includes(descriptor.admission)) {
    deny("BASEMAP_DESCRIPTOR_INVALID", "basemap identity/admission invalid");
  }
  if (!nonblank(descriptor.style?.version) || !nonblank(descriptor.tileVersion) ||
      !/^[a-f0-9]{64}$/i.test(descriptor.style?.sha256 ?? "")) {
    deny("BASEMAP_STYLE_UNVERIFIED", "exact version and SHA-256 style digest required");
  }
  if (!descriptor.style.immutable) {
    deny("BASEMAP_STYLE_UNVERIFIED", "mutable remote styles are not admitted");
  }
  const allKinds: BasemapAssetKind[] = ["style", "tile", "glyph", "sprite", "asset"];
  if (!descriptor.origins) deny("BASEMAP_DESCRIPTOR_INVALID", "origin allowlist required");
  for (const kind of allKinds) {
    const origins = descriptor.origins[kind];
    if (!Array.isArray(origins) || origins.length === 0) {
      deny("BASEMAP_DESCRIPTOR_INVALID", "every asset kind needs an explicit allowlist");
    }
    if (new Set(origins.map(exactOrigin)).size !== origins.length) {
      deny("BASEMAP_DESCRIPTOR_INVALID", "duplicate provider origin");
    }
  }
  const url = verifiedHttpsUrl(descriptor.style.url);
  if (!descriptor.origins.style.includes(url.origin)) {
    deny("BASEMAP_ORIGIN_DENIED", "style origin not admitted");
  }
  const attr = descriptor.attribution;
  if (!nonblank(attr?.label) || !Array.isArray(attr.licenseUrls) ||
      attr.licenseUrls.length === 0) {
    deny("BASEMAP_DESCRIPTOR_INVALID", "attribution and license references are mandatory");
  }
  for (const license of attr.licenseUrls) verifiedHttpsUrl(license);
  const p = descriptor.policy;
  if (!p || p.egress !== "public_area_only" ||
      !nonblank(p.retentionReview) ||
      !Number.isSafeInteger(p.maxRequestsPerView) || p.maxRequestsPerView < 1 || p.maxRequestsPerView > 200 ||
      !Number.isSafeInteger(p.timeoutMs) || p.timeoutMs < 100 || p.timeoutMs > 15_000 ||
      !Number.isSafeInteger(p.maxCacheAgeSeconds) || p.maxCacheAgeSeconds < 0 || p.maxCacheAgeSeconds > 86_400) {
    deny("BASEMAP_DESCRIPTOR_INVALID", "invalid public-only network budget or retention policy");
  }
  verifiedHttpsUrl(p.termsUrl);
  verifiedHttpsUrl(p.privacyUrl);
}

/** Pure validation: does not resolve DNS, follow redirects or perform I/O. */
export function validateBasemapDescriptor(descriptor: BasemapDescriptor): BasemapDescriptor {
  checkDescriptor(descriptor);
  return descriptor;
}

export type BasemapDecision =
  | { readonly available: true; readonly styleUrl: string; readonly attribution: string }
  | { readonly available: false; readonly reason: BasemapUnavailableReason; readonly attribution: string };

export interface BasemapController {
  readonly decide: () => BasemapDecision;
  readonly guardAsset: (kind: BasemapAssetKind, url: string) => string;
  /** Call on *every* redirect hop; automatic redirects must be disabled upstream. */
  readonly guardRedirect: (kind: BasemapAssetKind, url: string) => string;
  readonly setKilled: (disabled: boolean) => void;
  readonly setHealth: (health: BasemapHealth) => void;
  readonly requestCount: () => number;
}

export function createBasemapController(
  descriptor: BasemapDescriptor,
  environment: "development" | "production",
): BasemapController {
  validateBasemapDescriptor(descriptor);
  // Pin a defensive snapshot. Mutating the caller's configuration after
  // admission must not expand provider origins, change status or raise limits.
  const policy = Object.freeze({
    ...descriptor,
    style: Object.freeze({ ...descriptor.style }),
    policy: Object.freeze({ ...descriptor.policy }),
    attribution: Object.freeze({
      ...descriptor.attribution,
      licenseUrls: Object.freeze([...descriptor.attribution.licenseUrls]),
    }),
    origins: Object.freeze({
      style: Object.freeze([...descriptor.origins.style]),
      tile: Object.freeze([...descriptor.origins.tile]),
      glyph: Object.freeze([...descriptor.origins.glyph]),
      sprite: Object.freeze([...descriptor.origins.sprite]),
      asset: Object.freeze([...descriptor.origins.asset]),
    }),
  });
  let killed = false;
  let health: BasemapHealth = "unknown";
  let requests = 0;

  function decide(): BasemapDecision {
    const attribution = policy.attribution.label;
    if (killed || policy.admission === "disabled") {
      return { available: false, reason: "disabled", attribution };
    }
    if (policy.admission === "development_only" && environment !== "development") {
      return { available: false, reason: "development-only", attribution };
    }
    if (policy.admission !== "admitted" && policy.admission !== "development_only") {
      return { available: false, reason: "not-admitted", attribution };
    }
    if (health === "unavailable") return { available: false, reason: "provider-unavailable", attribution };
    if (health !== "healthy") return { available: false, reason: "provider-unhealthy", attribution };
    if (requests >= policy.policy.maxRequestsPerView) {
      return { available: false, reason: "request-budget-exhausted", attribution };
    }
    return { available: true, styleUrl: policy.style.url, attribution };
  }

  function guardAsset(kind: BasemapAssetKind, raw: string): string {
    const decision = decide();
    if (!decision.available) {
      if (decision.reason === "disabled") deny("BASEMAP_PROVIDER_DISABLED", "provider disabled by kill switch or admission");
      if (decision.reason === "request-budget-exhausted") deny("BASEMAP_REQUEST_BUDGET_EXCEEDED", "basemap request budget exceeded");
      if (decision.reason === "provider-unavailable" || decision.reason === "provider-unhealthy") {
        deny("BASEMAP_PROVIDER_UNAVAILABLE", "provider health unavailable or unknown");
      }
      deny("BASEMAP_NOT_ADMITTED", "provider not admitted in this environment");
    }
    if (!Object.prototype.hasOwnProperty.call(policy.origins, kind)) {
      deny("BASEMAP_REQUEST_INVALID", "unknown asset kind");
    }
    const parsed = verifiedHttpsUrl(raw);
    if (!policy.origins[kind].includes(parsed.origin)) {
      deny("BASEMAP_ORIGIN_DENIED", "asset origin is not in the explicit kind-specific allowlist");
    }
    requests += 1;
    return parsed.toString();
  }

  return {
    decide,
    guardAsset,
    guardRedirect: guardAsset,
    setKilled(value) { killed = value; },
    setHealth(value) {
      if (!["unknown", "healthy", "degraded", "unavailable"].includes(value)) {
        deny("BASEMAP_DESCRIPTOR_INVALID", "invalid provider health");
      }
      health = value;
    },
    requestCount() { return requests; },
  };
}

/**
 * Inspect recursively referenced URLs before admitting a remotely supplied
 * style. Known URL fields are kind-specific. All other HTTPS references
 * are treated as asset origins (fail closed).
 */
export function inspectBasemapStyleReferences(
  style: unknown,
  controller: BasemapController,
): number {
  if (!style || typeof style !== "object" || Array.isArray(style)) {
    deny("BASEMAP_STYLE_UNVERIFIED", "style JSON object required");
  }
  const root = style as Record<string, unknown>;
  if (root.version !== 8 || !root.sources || !root.layers ||
      typeof root.sources !== "object" || !Array.isArray(root.layers)) {
    deny("BASEMAP_STYLE_UNVERIFIED", "invalid style v8 structure");
  }
  const seen = new WeakSet<object>();
  let count = 0;
  function visit(value: unknown, parentKey: string, insideSource: boolean): void {
    if (typeof value === "string") {
      // Relative asset references would silently resolve under the hosting
      // style URL and must be inspected/rewritten by a future adapter first.
      if (["url", "tiles", "glyphs", "sprite"].includes(parentKey) &&
          !/^(?:https?:|data:|blob:|javascript:|\/\/)/i.test(value)) {
        deny("BASEMAP_REQUEST_INVALID", "relative or unresolved style asset reference");
      }
      if (/^(?:https?:|data:|blob:|javascript:|\/\/)/i.test(value)) {
        const kind: BasemapAssetKind = parentKey === "glyphs" ? "glyph"
          : parentKey === "sprite" ? "sprite"
          : parentKey === "tiles" ? "tile"
          : parentKey === "url" && insideSource ? "tile"
          : parentKey === "url" ? "asset"
          : "asset";
        controller.guardAsset(kind, value);
        count += 1;
      }
      return;
    }
    if (value && typeof value === "object") {
      if (seen.has(value)) deny("BASEMAP_STYLE_UNVERIFIED", "cyclic or duplicate style object");
      seen.add(value);
      if (Array.isArray(value)) {
        for (const item of value) visit(item, parentKey, insideSource);
      } else {
        for (const [key, item] of Object.entries(value)) {
          visit(item, key, insideSource || key === "sources");
        }
      }
    }
  }
  visit(root, "", false);
  return count;
}
