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


export const GEO02A_LOAD_TIMEOUT_MS = 12_000;

export interface Geo02aDeadlineClock {
  schedule(callback: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
}

// A renderer that never emits load/error must not leave the supplementary map
// stuck in a loading state. Completion and cancellation are both idempotent.
export function createGeo02aLoadDeadline(
  clock: Geo02aDeadlineClock,
  onTimeout: () => void,
): { complete: () => void } {
  let active = true;
  const handle = clock.schedule(() => {
    if (!active) return;
    active = false;
    onTimeout();
  }, GEO02A_LOAD_TIMEOUT_MS);
  return {
    complete: () => {
      if (!active) return;
      active = false;
      clock.cancel(handle);
    },
  };
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
  isReady(): boolean;
  onReady(listener: () => void): () => void;
  onError(listener: () => void): () => void;
}

export interface Geo02aRuntime {
  setWorkerUrl(url: string): void;
  createMap(options: Geo02aMapOptions): Geo02aMapHandle;
  isGpuInitializationError(error: unknown): boolean;
}

export type Geo02aUnavailableReason =
  | "webgl2-unavailable"
  | "initialization-failed"
  | "runtime-error";

export type Geo02aRendererState =
  | { readonly status: "starting"; readonly reason: null; readonly cleanup: () => void }
  | {
      readonly status: "unavailable";
      readonly reason: Geo02aUnavailableReason;
      readonly cleanup: () => void;
    };

export interface Geo02aLifecycleCallbacks {
  readonly onReady?: () => void;
  readonly onUnavailable?: (reason: Geo02aUnavailableReason) => void;
}

export function initializeGeo02aRenderer(
  runtime: Geo02aRuntime,
  container: unknown,
  pageOrigin: string,
  callbacks: Geo02aLifecycleCallbacks = {},
): Geo02aRendererState {
  let map: Geo02aMapHandle | null = null;
  let cleanup: () => void = () => undefined;

  try {
    runtime.setWorkerUrl(GEO02A_WORKER_URL);
    map = runtime.createMap({
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
    let offReady: () => void = () => undefined;
    let offError: () => void = () => undefined;
    cleanup = () => {
      if (removed) return;
      removed = true;
      offReady();
      offError();
      map?.remove();
    };

    let announcedReady = false;
    const notifyReady = () => {
      if (announcedReady) return;
      announcedReady = true;
      callbacks.onReady?.();
    };

    offError = map.onError(() => {
      callbacks.onUnavailable?.("runtime-error");
      cleanup();
    });
    offReady = map.onReady(notifyReady);

    // An empty style can become loaded before the listener is attached.
    // Query the renderer after registration so that fast initialization
    // cannot leave the UI permanently in the starting state.
    if (map.isReady()) notifyReady();

    return { status: "starting", reason: null, cleanup };
  } catch (error) {
    cleanup();
    return {
      status: "unavailable",
      reason: runtime.isGpuInitializationError(error) ? "webgl2-unavailable" : "initialization-failed",
      cleanup: () => undefined,
    };
  }
}