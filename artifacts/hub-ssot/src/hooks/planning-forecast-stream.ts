import type { PlanningForecast } from "@workspace/api-client-react";
import {
  streamAgentEndpoint,
  type PlanningAskStreamHandlers,
} from "./planning-ask-stream";

// POST to the forecast agent SSE endpoint and parse step / result / error
// events. The result mirrors the sync /planning/forecast contract, including
// the server-built governed draft, so "Open in editor" keeps working.
export async function streamPlanningForecast(
  body: { area: string; roleId: string },
  handlers: PlanningAskStreamHandlers,
  signal?: AbortSignal,
): Promise<PlanningForecast> {
  return streamAgentEndpoint<PlanningForecast>(
    "/api/planning/forecast/stream",
    body,
    handlers,
    "The forecast agent could not complete this request.",
    signal,
  );
}
