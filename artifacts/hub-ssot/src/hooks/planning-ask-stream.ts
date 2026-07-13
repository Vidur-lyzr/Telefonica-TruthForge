import type { Citation } from "@workspace/api-client-react";

// One live step of a calendar agent run, streamed from the agent as it
// genuinely happens: persona scope, governed retrieval, decision, composition.
export interface PlanningAskStep {
  id: string;
  label: string;
  state: "active" | "done";
  detail?: string | null;
}

// The streaming endpoint mirrors the /planning/ask contract but adds a
// "conversational" status for greetings and capability questions, where the
// agent replies without touching (or claiming) any calendar data.
export interface PlanningAskStreamResult {
  status: "answered" | "no_evidence" | "permission_blocked" | "conversational";
  answer: string;
  citations: Citation[];
  historic: boolean;
  permissionNote?: string | null;
  axisIds: string[];
  suggestedActions: string[];
}

export interface PlanningAskStreamHandlers {
  onStep: (step: PlanningAskStep) => void;
}

// POST to the planning agent SSE endpoint and parse step / result / error
// events. Resolves with the final result.
export async function streamPlanningAsk(
  body: { question: string; area: string; roleId: string },
  handlers: PlanningAskStreamHandlers,
  signal?: AbortSignal,
): Promise<PlanningAskStreamResult> {
  const response = await fetch("/api/planning/ask/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`planning ask stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: PlanningAskStreamResult | null = null;
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
      handlers.onStep(data as PlanningAskStep);
    } else if (event === "result") {
      result = data as PlanningAskStreamResult;
    } else if (event === "error") {
      streamError =
        (data as { error?: string }).error ??
        "The calendar agent could not complete this request.";
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
  if (!result) throw new Error("planning ask stream ended without a result");
  return result;
}
