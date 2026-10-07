export const GEO02A_MAPLIBRE_VERSION = "6.12.0";
export const GEO02A_WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";
export const GEO02A_REMOTE_ORIGINS: readonly string[] = Object.freeze([]);

export const GEO02A_RENDERER_ARTIFACTS = Object.freeze({
  measuredRawBytes: 1_216_681,
  maxRawBytes: 1_300_000,
  maxGzipBytes: 340_000,
  files: Object.freeze([
    "dist/maplibre-gl.mjs",
    "dist/maplibre-gl.css",
    "dist/maplibre-gl-worker.mjs",
    "dist/maplibre-gl-shared.mjs",
  ]),
});

export const GEO02A_EMPTY_STYLE = Object.freeze({
  version: 8 as const,
  sources: Object.freeze({}),
  layers: Object.freeze([]),
});

export class Geo02aRendererBoundaryError extends Error {
  readonly code: "GEO02A_REMOTE_ORIGIN_DENIED" | "GEO02A_REQUEST_URL_INVALID";

  constructor(code: Geo02aRendererBoundaryError["code"], message: string) {
    super(message);
    this.name = "Geo02aRendererBoundaryError";
    this.code = code;
  }
}

export interface Geo02aRequestParameters {
  readonly url: string;
}

export function allowSameOriginRendererRequest(url: string, pageOrigin: string): Geo02aRequestParameters {
  let page: URL;
  let parsed: URL;
  try {
    page = new URL(pageOrigin);
    parsed = new URL(url, page);
  } catch {
    throw new Geo02aRendererBoundaryError("GEO02A_REQUEST_URL_INVALID", "renderer request URL is invalid");
  }

  if (!["http:", "https:", "data:"].includes(parsed.protocol)) {
    throw new Geo02aRendererBoundaryError("GEO02A_REQUEST_URL_INVALID", "renderer request protocol is not allowed");
  }

  if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.origin !== page.origin) {
    throw new Geo02aRendererBoundaryError("GEO02A_REMOTE_ORIGIN_DENIED", "GEO-02A admits no remote renderer origin");
  }

  return { url: parsed.toString() };
}

export interface Geo02aMapOptions {
  readonly container: unknown;
  readonly style: typeof GEO02A_EMPTY_STYLE;
  readonly center: readonly [number, number];
  readonly zoom: number;
  readonly keyboard: true;
  readonly interactive: true;
  readonly attributionControl: false;
  readonly transformRequest: (url: string) => Geo02aRequestParameters;
}

export interface Geo02aMapHandle {
  remove(): void;
}

export interface Geo02aRuntime {
  setWorkerUrl(url: string): void;
  createMap(options: Geo02aMapOptions): Geo02aMapHandle;
  isGpuInitializationError(error: unknown): boolean;
}

export type Geo02aRendererState =
  | { readonly status: "ready"; readonly reason: null; readonly cleanup: () => void }
  | {
      readonly status: "unavailable";
      readonly reason: "webgl2-unavailable" | "initialization-failed";
      readonly cleanup: () => void;
    };

export function initializeGeo02aRenderer(
  runtime: Geo02aRuntime,
  container: unknown,
  pageOrigin: string,
): Geo02aRendererState {
  try {
    runtime.setWorkerUrl(GEO02A_WORKER_URL);
    const map = runtime.createMap({
      container,
      style: GEO02A_EMPTY_STYLE,
      center: [46.6753, 24.7136],
      zoom: 10,
      keyboard: true,
      interactive: true,
      attributionControl: false,
      transformRequest: (url) => allowSameOriginRendererRequest(url, pageOrigin),
    });

    let removed = false;
    return {
      status: "ready",
      reason: null,
      cleanup: () => {
        if (removed) return;
        removed = true;
        map.remove();
      },
    };
  } catch (error) {
    return {
      status: "unavailable",
      reason: runtime.isGpuInitializationError(error) ? "webgl2-unavailable" : "initialization-failed",
      cleanup: () => undefined,
    };
  }
}