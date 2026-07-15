import app from "./app";
import { logger } from "./lib/logger";
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

// Order matters: live wiki pages may cite live-ingested docs, and their area
// scope derives from those docs (resolvePageAccess fails closed until the
// sources resolve) — so pages hydrate only after live docs finish.
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
