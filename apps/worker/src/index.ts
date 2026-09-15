// Minimal worker lifecycle (M001): startup/shutdown only, no business workflows.
export function createWorker() {
  let running = false;
  return {
    start() {
      running = true;
    },
    async stop() {
      running = false;
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
