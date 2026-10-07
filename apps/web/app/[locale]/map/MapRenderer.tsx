"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  initializeGeo02aRenderer,
  createGeo02aLoadDeadline,
  type Geo02aMapOptions,
  type Geo02aRendererState,
} from "./renderer-contract";

type UiState = "loading" | "ready" | Geo02aRendererState["status"];

export function MapRenderer({ locale }: { locale: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<UiState>("loading");
  const ar = locale === "ar";

  useEffect(() => {
    let disposed = false;
    let cleanup: () => void = () => undefined;
    const deadline = createGeo02aLoadDeadline(
      {
        schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
        cancel: (handle) => window.clearTimeout(handle as number),
      },
      () => {
        if (disposed) return;
        disposed = true;
        cleanup();
        setState("unavailable");
      },
    );
    const unavailable = () => {
      if (disposed) return;
      deadline.complete();
      disposed = true;
      cleanup();
      setState("unavailable");
    };

    void import("maplibre-gl")
      .then((maplibre) => {
        if (disposed || !containerRef.current) return;

        const result = initializeGeo02aRenderer(
          {
            setWorkerUrl: maplibre.setWorkerUrl,
            isGpuInitializationError: (error) => error instanceof maplibre.GPUInitializationError,
            createMap: (options: Geo02aMapOptions) => {
              const map = new maplibre.Map({
                container: options.container as HTMLElement,
                style: { version: options.style.version, sources: {}, layers: [] },
                center: [options.center[0], options.center[1]],
                zoom: options.zoom,
                keyboard: options.keyboard,
                interactive: options.interactive,
                attributionControl: options.attributionControl,
                transformRequest: (url) => options.transformRequest(url),
              });
              return {
                remove: () => map.remove(),
                isReady: () => map.loaded(),
                onReady: (listener) => {
                  map.on("load", listener);
                  return () => map.off("load", listener);
                },
                onError: (listener) => {
                  const handler = () => listener();
                  map.on("error", handler);
                  return () => map.off("error", handler);
                },
              };
            },
          },
          containerRef.current,
          window.location.origin,
          {
            onReady: () => {
              if (disposed) return;
              deadline.complete();
              setState("ready");
            },
            onUnavailable: unavailable,
          },
        );

        cleanup = result.cleanup;
        if (disposed) {
          result.cleanup();
        } else if (result.status === "unavailable") {
          unavailable();
        }
      })
      .catch(unavailable);

    return () => {
      disposed = true;
      deadline.complete();
      cleanup();
    };
  }, []);

  return (
    <div className="zyara-maplibre-shell" data-renderer-state={state}>
      <div
        ref={containerRef}
        className="zyara-maplibre-canvas"
        role="group"
        aria-label={ar ? "خريطة تفاعلية إضافية، والقائمة أدناه بديل كامل" : "Supplementary interactive map; the list below is the complete alternative"}
        data-worker="/maplibre/maplibre-gl-worker.mjs"
      />
      {state === "unavailable" ? (
        <p className="zyara-map-unavailable" role="status">
          {ar
            ? "الخريطة غير متاحة على هذا الجهاز الآن. القائمة أدناه تعمل بالكامل."
            : "The map is unavailable on this device. The complete list below remains available."}
        </p>
      ) : null}
    </div>
  );
}