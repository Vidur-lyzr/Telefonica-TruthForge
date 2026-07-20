// Metered Anthropic call — the single chokepoint every agent uses instead of
// calling anthropic.messages.create directly. Records real token usage from
// the API response into the usage meter, attributed to the calling module, so
// the Administration cost model is fed by the app's own consumption.

import { anthropic } from "@workspace/integrations-anthropic-ai";
import {
  recordUsage,
  estimateTokens,
  type UsageModule,
} from "../data/usageMeter";
import { enforceQuota, recordUserUsage } from "../data/userUsage";
import { getActingUser } from "../lib/usageContext";
import { logger } from "../lib/logger";

// Pre-model quota gate + per-user attribution. Identity comes from the usage
// context (verified session, threaded by middleware). Throws
// QuotaExceededError BEFORE any Claude call when the acting user's period
// allowance is spent; unattributed calls (background jobs) pass through.
// The gate SUMs the usage_ledger table, so it is correct across instances.
export async function gateQuota(): Promise<string | null> {
  const user = getActingUser();
  if (!user) return null;
  await enforceQuota(user.email);
  return user.email;
}

/**
 * Attribute an ESTIMATED usage figure for model runs that go through the
 * gitagent runtime (which does not expose token counts). Same chokepoint
 * semantics as the metered wrappers: global meter always, per-user ledger
 * when an acting user is present. Call gateQuota() BEFORE the run.
 */
export function attributeEstimated(
  email: string | null,
  module: UsageModule,
  input: number,
  output: number,
): void {
  attribute(email, module, input, output);
}

// The global meter records synchronously; the per-user ledger row is an
// awaitless DB insert — a failure is logged, never allowed to fail the
// request whose model call already succeeded.
function attribute(
  email: string | null,
  module: UsageModule,
  input: number,
  output: number,
): void {
  recordUsage(module, input, output);
  if (email) {
    void recordUserUsage(email, module, input, output).catch((err) => {
      logger.error({ err, email, module }, "user usage ledger insert failed");
    });
  }
}

interface MeteredCreateParams {
  model: string;
  max_tokens: number;
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

// Streaming variant: emits text deltas as they arrive and resolves with the
// full text. Usage is metered from the stream's own reported token counts,
// falling back to an estimate.
export async function meteredStream(
  module: UsageModule,
  params: MeteredCreateParams,
  onToken: (content: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const email = await gateQuota();
  const stream = anthropic.messages.stream({ ...params });
  let text = "";
  stream.on("text", (delta) => {
    if (signal?.aborted) return;
    text += delta;
    onToken(delta);
  });
  const final = await stream.finalMessage();
  const input =
    final.usage?.input_tokens ?? estimateTokens(JSON.stringify(params.messages));
  const output = final.usage?.output_tokens ?? estimateTokens(text);
  attribute(email, module, input, output);
  return text;
}

export async function meteredCreate(module: UsageModule, params: MeteredCreateParams) {
  const email = await gateQuota();
  const message = await anthropic.messages.create({ ...params, stream: false });
  const input =
    message.usage?.input_tokens ?? estimateTokens(JSON.stringify(params.messages));
  const output =
    message.usage?.output_tokens ??
    estimateTokens(
      message.content.map((b) => (b.type === "text" ? b.text : "")).join(""),
    );
  attribute(email, module, input, output);
  return message;
}
