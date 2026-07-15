import type { WikiSearchResult, WikiSearchInput } from "@workspace/api-client-react";
import type { AskStep } from "./ask-stream";

export interface WikiStreamHandlers {
  onStep: (step: AskStep) => void;
  onToken: (content: string) => void;
}

// POST to the wiki SSE endpoint and parse step / token / result / error
// events. Resolves with the final WikiSearchResult (evidence lands last,
// inside the result).
export async function streamWikiSearch(
  body: WikiSearchInput,
  handlers: WikiStreamHandlers,
  signal?: AbortSignal,
): Promise<WikiSearchResult> {
  const response = await fetch("/api/wiki/search/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`wiki search stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: WikiSearchResult | null = null;
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
      result = data as WikiSearchResult;
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
  if (!result) throw new Error("wiki search stream ended without a result");
  return result;
}
