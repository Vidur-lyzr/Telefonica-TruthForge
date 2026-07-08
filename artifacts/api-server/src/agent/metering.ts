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

interface MeteredCreateParams {
  model: string;
  max_tokens: number;
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function meteredCreate(module: UsageModule, params: MeteredCreateParams) {
  const message = await anthropic.messages.create({ ...params, stream: false });
  const input =
    message.usage?.input_tokens ?? estimateTokens(JSON.stringify(params.messages));
  const output =
    message.usage?.output_tokens ??
    estimateTokens(
      message.content.map((b) => (b.type === "text" ? b.text : "")).join(""),
    );
  recordUsage(module, input, output);
  return message;
}
