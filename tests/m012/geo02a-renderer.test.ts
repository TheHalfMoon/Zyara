import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { gzipSync } from "node:zlib";
import {
  GEO02A_EMPTY_STYLE,
  GEO02A_MAPLIBRE_VERSION,
  GEO02A_REMOTE_ORIGINS,
  GEO02A_RENDERER_ARTIFACTS,
  GEO02A_WORKER_URL,
  GEO02A_LOAD_TIMEOUT_MS,
  createGeo02aLoadDeadline,
  Geo02aRendererBoundaryError,
  allowSameOriginRendererRequest,
  initializeGeo02aRenderer,
  type Geo02aMapOptions,
} from "../../apps/web/app/[locale]/map/renderer-contract";

function fakeRuntime(options: { gpuFailure?: boolean; fail?: boolean; subscribeFail?: boolean; initiallyReady?: boolean } = {}) {
  let workerUrl = "";
  let created: Geo02aMapOptions | null = null;
  let removes = 0;
  let unsubscribes = 0;
  let readyListener: (() => void) | null = null;
  let errorListener: (() => void) | null = null;
  const gpuError = new Error("webgl2 unavailable");

  return {
    state: {
      get workerUrl() { return workerUrl; },
      get created() { return created; },
      get removes() { return removes; },
      get unsubscribes() { return unsubscribes; },
      triggerReady() { readyListener?.(); },
      triggerError() { errorListener?.(); },
      gpuError,
    },
    runtime: {
      setWorkerUrl(value: string) {
        workerUrl = value;
      },
      isGpuInitializationError(error: unknown) {
        return options.gpuFailure && error === gpuError;
      },
      createMap(value: Geo02aMapOptions) {
        created = value;
        if (options.fail) throw options.gpuFailure ? gpuError : new Error("init failed");
        return {
          remove: () => { removes += 1; },
          isReady: () => options.initiallyReady === true,
          onReady: (listener: () => void) => {
            if (options.subscribeFail) throw new Error("listener registration failed");
            readyListener = listener;
            return () => { unsubscribes += 1; readyListener = null; };
          },
          onError: (listener: () => void) => {
            errorListener = listener;
            return () => { unsubscribes += 1; errorListener = null; };
          },
        };
      },
    },
  };
}

test("GEO-02A fail-closes when the renderer never signals load or error", () => {
  let scheduled: (() => void) | null = null;
  let delay = -1;
  let cancelled = 0;
  let unavailable = 0;
  const clock = {
    schedule(callback: () => void, ms: number) {
      scheduled = callback;
      delay = ms;
      return 17;
    },
    cancel(handle: unknown) {
      assert.equal(handle, 17);
      cancelled += 1;
    },
  };

  const stuck = createGeo02aLoadDeadline(clock, () => { unavailable += 1; });
  assert.equal(delay, GEO02A_LOAD_TIMEOUT_MS);
  assert.ok(scheduled);
  scheduled?.();
  scheduled?.();
  assert.equal(unavailable, 1);
  stuck.complete();
  assert.equal(cancelled, 0, "expired deadline is already inactive");

  const ready = createGeo02aLoadDeadline(clock, () => { unavailable += 1; });
  ready.complete();
  ready.complete();
  scheduled?.();
  assert.equal(unavailable, 1, "a completed renderer must not become unavailable");
  assert.equal(cancelled, 1);

  const renderer = readFileSync(new URL("../../apps/web/app/[locale]/map/MapRenderer.tsx", import.meta.url), "utf8");
  assert.ok(renderer.includes("createGeo02aLoadDeadline("));
  assert.ok(renderer.includes("result.cleanup();"));
});

test("GEO-02A initializes the exact renderer shell and cleans up once", () => {
  const fake = fakeRuntime();
  const container = {};
  let uiState = "loading";
  const result = initializeGeo02aRenderer(fake.runtime, container, "https://zyara.example", {
    onReady: () => { uiState = "ready"; },
    onUnavailable: () => { uiState = "unavailable"; },
  });

  assert.equal(result.status, "starting");
  assert.equal(fake.state.workerUrl, GEO02A_WORKER_URL);
  assert.equal(fake.state.created?.container, container);
  assert.equal(fake.state.created?.style, GEO02A_EMPTY_STYLE);
  assert.deepEqual(fake.state.created?.center, [46.6753, 24.7136]);
  assert.equal(fake.state.created?.zoom, 10);
  assert.equal(fake.state.created?.keyboard, true);
  assert.equal(fake.state.created?.interactive, true);
  assert.equal(fake.state.created?.attributionControl, false);
  assert.equal(uiState, "loading");
  fake.state.triggerReady();
  assert.equal(uiState, "ready");

  result.cleanup();
  result.cleanup();
  assert.equal(fake.state.removes, 1);
  assert.equal(fake.state.unsubscribes, 2);
});

test("GEO-02A fails closed for WebGL2/GPU and general initialization failures", () => {
  const gpu = fakeRuntime({ fail: true, gpuFailure: true });
  const gpuResult = initializeGeo02aRenderer(gpu.runtime, {}, "https://zyara.example");
  assert.deepEqual([gpuResult.status, gpuResult.reason], ["unavailable", "webgl2-unavailable"]);

  const generic = fakeRuntime({ fail: true });
  const genericResult = initializeGeo02aRenderer(generic.runtime, {}, "https://zyara.example");
  assert.deepEqual([genericResult.status, genericResult.reason], ["unavailable", "initialization-failed"]);
});

test("GEO-02A observes an already-loaded renderer without missing the ready transition", () => {
  const fake = fakeRuntime({ initiallyReady: true });
  let readyCalls = 0;
  const result = initializeGeo02aRenderer(fake.runtime, {}, "https://zyara.example", {
    onReady: () => { readyCalls += 1; },
  });

  assert.equal(result.status, "starting");
  assert.equal(readyCalls, 1);
  fake.state.triggerReady();
  assert.equal(readyCalls, 1, "ready must be announced at most once");
  result.cleanup();
});

test("GEO-02A listener registration failures remove the map exactly once", () => {
  const fake = fakeRuntime({ subscribeFail: true });
  const result = initializeGeo02aRenderer(fake.runtime, {}, "https://zyara.example");
  assert.deepEqual([result.status, result.reason], ["unavailable", "initialization-failed"]);
  assert.equal(fake.state.removes, 1);
});

test("GEO-02A runtime errors fail closed and release renderer resources", () => {
  const fake = fakeRuntime();
  let reason = "";
  const result = initializeGeo02aRenderer(fake.runtime, {}, "https://zyara.example", {
    onUnavailable: (value) => { reason = value; },
  });

  assert.equal(result.status, "starting");
  fake.state.triggerError();
  assert.equal(reason, "runtime-error");
  assert.equal(fake.state.removes, 1);
  assert.equal(fake.state.unsubscribes, 2);
});

test("GEO-02A admits same-origin renderer requests and denies remote origins", () => {
  assert.deepEqual(GEO02A_REMOTE_ORIGINS, []);
  assert.equal(
    allowSameOriginRendererRequest("/maplibre/maplibre-gl-worker.mjs", "https://zyara.example").url,
    "https://zyara.example/maplibre/maplibre-gl-worker.mjs",
  );
  assert.equal(allowSameOriginRendererRequest("data:text/plain,ok", "https://zyara.example").url, "data:text/plain,ok");

  assert.throws(
    () => allowSameOriginRendererRequest("https://tiles.example/style.json", "https://zyara.example"),
    (error: unknown) => error instanceof Geo02aRendererBoundaryError && error.code === "GEO02A_REMOTE_ORIGIN_DENIED",
  );
  assert.throws(
    () => allowSameOriginRendererRequest("blob:https://zyara.example/worker", "https://zyara.example"),
    (error: unknown) => error instanceof Geo02aRendererBoundaryError && error.code === "GEO02A_REQUEST_URL_INVALID",
  );
});

test("GEO-02A route keeps RTL and the independent accessible list", () => {
  const page = readFileSync(new URL("../../apps/web/app/[locale]/map/page.tsx", import.meta.url), "utf8");
  const renderer = readFileSync(new URL("../../apps/web/app/[locale]/map/MapRenderer.tsx", import.meta.url), "utf8");

  assert.ok(page.includes('dir={ar ? "rtl" : "ltr"}'));
  assert.ok(page.includes('aria-label="branch-list"'));
  assert.ok(page.includes("<MapRenderer locale={active} />"));
  assert.ok(renderer.includes("complete list below remains available"));
  assert.ok(!renderer.includes("setRTLTextPlugin"));
  assert.ok(!renderer.includes("http://") && !renderer.includes("https://"));
});

test("GEO-02A map route has a same-origin-only renderer CSP", () => {
  const config = readFileSync(new URL("../../apps/web/next.config.mjs", import.meta.url), "utf8");
  assert.ok(config.includes('source: "/:locale/map"'));
  assert.ok(config.includes("connect-src 'self'"));
  assert.ok(config.includes("worker-src 'self'"));
  assert.ok(config.includes("object-src 'none'"));
  assert.ok(!config.includes("worker-src 'self' blob:"));
});

test("GEO-02A pins MapLibre exactly and self-hosts worker, shared module and license", () => {
  const webPackage = JSON.parse(readFileSync(new URL("../../apps/web/package.json", import.meta.url), "utf8")) as {
    dependencies: Record<string, string>;
  };
  const copyScript = readFileSync(new URL("../../apps/web/scripts/copy-maplibre-worker.mjs", import.meta.url), "utf8");

  assert.equal(GEO02A_MAPLIBRE_VERSION, "6.12.0");
  assert.equal(webPackage.dependencies["maplibre-gl"], GEO02A_MAPLIBRE_VERSION);
  for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs", "LICENSE.txt"]) {
    assert.ok(copyScript.includes(file));
  }

  const webRequire = createRequire(new URL("../../apps/web/package.json", import.meta.url));
  const packageJsonPath = webRequire.resolve("maplibre-gl/package.json");
  const packageRoot = path.dirname(packageJsonPath);
  const installed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version: string; license: string };
  const license = readFileSync(path.join(packageRoot, "LICENSE.txt"), "utf8");

  assert.deepEqual([installed.version, installed.license], ["6.12.0", "BSD-3-Clause"]);
  for (const notice of ["MapLibre contributors", "mapbox-gl-js v1.13", "glfx.js", "d3-color"]) {
    assert.ok(license.includes(notice), notice);
  }
});

test("GEO-02A enforces the measured MapLibre runtime artifact budget", () => {
  const webRequire = createRequire(new URL("../../apps/web/package.json", import.meta.url));
  const packageRoot = path.dirname(webRequire.resolve("maplibre-gl/package.json"));

  let raw = 0;
  let gzip = 0;
  for (const relative of GEO02A_RENDERER_ARTIFACTS.files) {
    const file = path.join(packageRoot, relative);
    const bytes = readFileSync(file);
    assert.equal(statSync(file).size, bytes.length);
    raw += bytes.length;
    gzip += gzipSync(bytes, { level: 9 }).length;
  }

  assert.equal(raw, GEO02A_RENDERER_ARTIFACTS.measuredRawBytes);
  assert.ok(raw <= GEO02A_RENDERER_ARTIFACTS.maxRawBytes, `raw bytes ${raw}`);
  assert.ok(gzip <= GEO02A_RENDERER_ARTIFACTS.maxGzipBytes, `gzip bytes ${gzip}`);
});