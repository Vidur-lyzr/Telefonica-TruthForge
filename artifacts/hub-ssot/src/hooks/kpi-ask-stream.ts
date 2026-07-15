import type { AskResult } from "@workspace/api-client-react";

// One live step of a KPI agent run, streamed from the agent as it genuinely
// happens: scope resolution, KPI data read, evidence retrieval, composition.
export interface KpiAskStep {
  id: string;
  label: string;
  state: "active" | "done";
  detail?: string | null;
}

export interface KpiAskStreamBody {
  question: string;
  area: string;
  roleId: string;
  kpiIds: string[];
  rangeFrom?: string | null;
  rangeTo?: string | null;
  period?: string | null;
}

export interface KpiAskStreamHandlers {
  onStep: (step: KpiAskStep) => void;
  onToken: (content: string) => void;
}

// POST to the KPI agent SSE endpoint and parse step / token / result / error
// events. Resolves with the final result (citations land last, inside it).
export async function streamKpiAsk(
  body: KpiAskStreamBody,
  handlers: KpiAskStreamHandlers,
  signal?: AbortSignal,
): Promise<AskResult> {
  const response = await fetch("/api/kpis/ask/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`kpi ask stream failed: ${response.status}`);
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
      handlers.onStep(data as KpiAskStep);
    } else if (event === "token") {
      const content = (data as { content?: string }).content;
      if (content) handlers.onToken(content);
    } else if (event === "result") {
      result = data as AskResult;
    } else if (event === "error") {
      streamError =
        (data as { error?: string }).error ??
        "The Hub could not complete this request.";
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
  if (!result) throw new Error("kpi ask stream ended without a result");
  return result;
}
