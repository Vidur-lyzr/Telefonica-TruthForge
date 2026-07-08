import type { AskResult, AskInput } from "@workspace/api-client-react";

// One live step of a governed run, as streamed from the agent. Steps are real
// milestones (scope resolution, retrieval, tool calls, composition) — the UI
// renders them as they genuinely happen.
export interface AskStep {
  id: string;
  label: string;
  state: "active" | "done";
  detail?: string | null;
}

export interface AskStreamHandlers {
  onStep: (step: AskStep) => void;
  onToken: (content: string) => void;
}

// POST to the SSE endpoint and parse step / token / result / error events.
// Resolves with the final AskResult (citations land last, inside the result).
export async function streamAsk(
  body: AskInput,
  handlers: AskStreamHandlers,
  signal?: AbortSignal,
): Promise<AskResult> {
  const response = await fetch("/api/ask/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`ask stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AskResult | null = null;
  let streamError: string | null = null;

  const handleFrame = (frame: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const rawLine of frame.split("\n")) {
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;
    let data: unknown;
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      return;
    }
    if (event === "step") {
      handlers.onStep(data as AskStep);
    } else if (event === "token") {
      const content = (data as { content?: string }).content;
      if (content) handlers.onToken(content);
    } else if (event === "result") {
      result = data as AskResult;
    } else if (event === "error") {
      streamError =
        (data as { error?: string }).error ?? "The Hub could not complete this request.";
    }
  };

  // Frames are separated by a blank line; tolerate CRLF framing too, and
  // parse any residual buffer at end-of-stream so a non-terminated final
  // frame is not silently dropped.
  const drainBuffer = () => {
    let idx: number;
    for (;;) {
      const lf = buffer.indexOf("\n\n");
      const crlf = buffer.indexOf("\r\n\r\n");
      if (lf === -1 && crlf === -1) break;
      if (crlf !== -1 && (lf === -1 || crlf < lf)) {
        idx = crlf;
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 4);
        if (frame.trim()) handleFrame(frame);
      } else {
        idx = lf;
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (frame.trim()) handleFrame(frame);
      }
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    drainBuffer();
  }
  buffer += decoder.decode();
  drainBuffer();
  if (buffer.trim()) handleFrame(buffer);

  if (streamError) throw new Error(streamError);
  if (!result) throw new Error("ask stream ended without a result");
  return result;
}
