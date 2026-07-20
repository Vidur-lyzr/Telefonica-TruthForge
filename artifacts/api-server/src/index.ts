import app from "./app";
import { logger } from "./lib/logger";
import { initGovernance } from "./data/governance";
import { initSourceSync } from "./data/sourceSync";
import { initGenerateStore } from "./data/generateStore";
import { initKpiStore } from "./data/kpiStore";
import { initPlanningStore } from "./data/planningStore";
import { initQualityStore } from "./data/qualityStore";
import { initTemplateOverrides } from "./data/templateOverrides";
import { initUsageMeter } from "./data/usageMeter";
import { initObservatory } from "./data/observatoryStore";
import { initPlatformUsers } from "./data/platformUsers";
import { hydrateLiveDocs } from "./data/liveIngest";
import { hydrateWikiPages } from "./data/wikiStore";
import { startScheduler } from "./agent/scheduleRunner";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function boot(): Promise<void> {
  // Load all persisted store snapshots from Postgres BEFORE the server
  // accepts requests. Order matters for the corpus-mutating replays:
  // governance re-applies taxonomy versions to DOCS/AXES first, then
  // source-sync replays confidentiality label deltas. The remaining stores
  // are independent overlays and load in parallel. Every init fails soft, so
  // a bad snapshot can never keep the API down.
  await initGovernance();
  await initSourceSync();
  await Promise.all([
    initGenerateStore(),
    initKpiStore(),
    initPlanningStore(),
    initQualityStore(),
    initTemplateOverrides(),
    initUsageMeter(),
    initObservatory(),
    initPlatformUsers(),
  ]);

  // Order matters: live wiki pages may cite live-ingested docs, and their
  // area scope derives from those docs (resolvePageAccess fails closed until
  // the sources resolve) — so pages hydrate only after live docs finish.
  void hydrateLiveDocs(logger)
    .then(() => hydrateWikiPages(logger))
    .catch((err) => logger.error({ err }, "boot hydration failed"));

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startScheduler();
  });
}

boot().catch((err) => {
  logger.error({ err }, "boot failed");
  process.exit(1);
});
