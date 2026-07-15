// GitAgent runtime bridge.
//
// Runs the Hub's answering agent through the gitagent SDK (in-process GAP
// runtime): the agent's identity, rules, and knowledge live as version-
// controlled files in ./agent (agent.yaml, SOUL.md, RULES.md, knowledge/).
//
// Model routing: gitagent resolves models through pi-ai's shared registry.
// We point the anthropic models at the Replit Anthropic proxy by patching the
// registry entry's baseUrl and exposing the proxy key as ANTHROPIC_API_KEY —
// the registry is a shared in-process singleton, so gitagent's own loader
// picks up the patched model.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { query, tool, type GCToolDefinition } from "@open-gitagent/gitagent";

export { tool };
export type { GCToolDefinition };

// Resolve the agent repo across dev and production. In dev the server runs
// with cwd = artifacts/api-server, so ./agent is present. In production the
// bundled server is started as `node artifacts/api-server/dist/index.mjs`
// from the workspace root, so cwd/agent does not exist — the build copies the
// repo to dist/agent, which we find relative to this compiled module.
function resolveAgentDir(): string {
  if (process.env.HUBSSOT_AGENT_DIR) return process.env.HUBSSOT_AGENT_DIR;
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, "agent"), // dist/agent (production, copied by build)
    path.resolve(process.cwd(), "agent"), // dev (cwd = artifacts/api-server)
    path.resolve(process.cwd(), "artifacts/api-server/agent"), // prod fallback
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "agent.yaml"))) return dir;
  }
  return candidates[0];
}

export const AGENT_DIR = resolveAgentDir();

// The answering agent must never shell out or mutate its own repo mid-answer.
// Single source of truth: runAgent enforces this list and the admin Agent page
// reports the same one.
export const DISALLOWED_TOOLS = ["cli", "write", "memory"] as const;

export const AGENT_MODEL = "anthropic:claude-sonnet-4-6";

let routingPatched: Promise<void> | null = null;

async function patchAnthropicRouting(): Promise<void> {
  const baseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Anthropic AI integration env is missing (AI_INTEGRATIONS_ANTHROPIC_BASE_URL / _API_KEY)",
    );
  }

  // Resolve gitagent's own pi-ai instance (the exact module its loader uses).
  const gitagentUrl = import.meta.resolve("@open-gitagent/gitagent");
  const modelsUrl = new URL(
    "../../../@mariozechner/pi-ai/dist/models.js",
    gitagentUrl,
  );
  const pi = (await import(modelsUrl.href)) as {
    getModels: (provider: string) => Array<{ id: string; baseUrl?: string }>;
  };

  const models = pi.getModels("anthropic");
  if (!models.length) {
    throw new Error("pi-ai anthropic model registry is empty; cannot route model traffic");
  }
  for (const m of models) {
    m.baseUrl = baseUrl;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    process.env.ANTHROPIC_API_KEY = apiKey;
  }
}

function ensureRouting(): Promise<void> {
  if (!routingPatched) {
    routingPatched = patchAnthropicRouting().catch((err) => {
      routingPatched = null;
      throw err;
    });
  }
  return routingPatched;
}

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
  isError?: boolean;
}

export interface AgentRunResult {
  text: string;
  toolCalls: AgentToolCall[];
  turns: number;
  model: string;
}

// Live events surfaced while the agent runs, so callers can stream real
// progress (tool calls, text deltas) instead of simulating it.
export type AgentEvent =
  | { type: "tool_use"; toolName: string; args: Record<string, unknown> }
  | { type: "tool_result"; toolName: string; isError: boolean }
  | { type: "text_delta"; content: string }
  | { type: "turn"; turn: number };

interface Logger {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

export interface AgentRunInput {
  prompt: string;
  systemPromptSuffix?: string;
  tools?: GCToolDefinition[];
  maxTurns?: number;
  log: Logger;
  onEvent?: (event: AgentEvent) => void;
}

// Run one governed answering pass through the GAP agent repo. Returns the
// final assistant text plus a trace of every tool call the agent made.
export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  await ensureRouting();

  const toolCalls: AgentToolCall[] = [];
  let turns = 0;
  let finalText = "";
  let model = AGENT_MODEL;
  let errorMessage: string | null = null;

  for await (const msg of query({
    prompt: input.prompt,
    dir: AGENT_DIR,
    model: AGENT_MODEL,
    systemPromptSuffix: input.systemPromptSuffix,
    tools: input.tools ?? [],
    // The answering agent must not shell out or mutate the repo mid-answer.
    disallowedTools: [...DISALLOWED_TOOLS],
    maxTurns: input.maxTurns ?? 6,
  })) {
    switch (msg.type) {
      case "assistant":
        turns += 1;
        model = msg.model || model;
        if (msg.stopReason === "error") {
          errorMessage = msg.errorMessage ?? "model returned an error";
        }
        if (msg.content?.trim()) finalText = msg.content.trim();
        input.onEvent?.({ type: "turn", turn: turns });
        break;
      case "delta":
        if (msg.deltaType === "text" && msg.content) {
          input.onEvent?.({ type: "text_delta", content: msg.content });
        }
        break;
      case "tool_use":
        toolCalls.push({ name: msg.toolName, args: msg.args });
        input.onEvent?.({
          type: "tool_use",
          toolName: msg.toolName,
          args: msg.args,
        });
        break;
      case "tool_result":
        if (msg.isError) {
          const last = toolCalls[toolCalls.length - 1];
          if (last && last.name === msg.toolName) last.isError = true;
        }
        input.onEvent?.({
          type: "tool_result",
          toolName: msg.toolName,
          isError: msg.isError,
        });
        break;
      case "system":
        if (msg.subtype === "error") {
          errorMessage = msg.content;
        }
        break;
      default:
        break;
    }
  }

  if (!finalText && errorMessage) {
    throw new Error(`gitagent run failed: ${errorMessage}`);
  }

  input.log.info(
    { turns, toolCalls: toolCalls.map((t) => t.name), model },
    "gitagent: run complete",
  );

  return { text: finalText, toolCalls, turns, model };
}
