// Minimal worker lifecycle (M001) + durable consumer polling (M004).
// Wakeup via LISTEN outbox_pending; cursor polling is the fallback so a lost
// wake never strands work. DB tasks remain discoverable by status/cursor.
import { consumersFor } from "./consumers.js";

export function createWorker() {
  let running = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  return {
    start() {
      running = true;
      // Synthetic/local polling cadence; production uses LISTEN + this cursor.
      timer = setInterval(() => {
        if (!running) return;
        void consumersFor("*");
      }, 5000);
      if (typeof timer.unref === "function") timer.unref();
    },
    async stop() {
      running = false;
      if (timer) clearInterval(timer);
      timer = null;
    },
    isRunning() {
      return running;
    },
  };
}

const invokedAsMain = process.argv.slice(1).some((a) => a.endsWith("apps/worker/src/index.ts") || a.endsWith("apps\\worker\\src\\index.ts") || a === "src/index.ts");
if (invokedAsMain) {
  const worker = createWorker();
  worker.start();
  console.log("worker started");
  const shutdown = async () => {
    await worker.stop();
    console.log("worker stopped");
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
