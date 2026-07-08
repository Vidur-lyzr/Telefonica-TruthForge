import { Router, type IRouter } from "express";
import { AskBody, AskResponse } from "@workspace/api-zod";
import { runAskAgent, type AskStreamEvent } from "../agent/askAgent";

const router: IRouter = Router();

router.post("/ask", async (req, res) => {
  const parsed = AskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }

  try {
    const result = await runAskAgent(parsed.data, req.log);
    const data = AskResponse.parse(result);
    res.json(data);
    return;
  } catch (err) {
    req.log.error({ err }, "ask route failed");
    res.status(500).json({ error: "The Hub could not complete this request." });
    return;
  }
});

// Streaming variant: Server-Sent Events carrying the run's real progress.
// Event order: step / token events as they genuinely happen, then a single
// terminal `result` event (citations always land last), then `done`.
router.post("/ask/stream", async (req, res) => {
  const parsed = AskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let closed = false;
  const abort = new AbortController();
  res.on("close", () => {
    closed = true;
    abort.abort();
  });

  const send = (event: string, data: unknown) => {
    if (closed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const emit = (ev: AskStreamEvent) => {
    if (ev.type === "step") send("step", ev);
    else send("token", { content: ev.content });
  };

  try {
    const result = await runAskAgent(parsed.data, req.log, emit, abort.signal);
    send("result", AskResponse.parse(result));
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      req.log.info("ask stream cancelled: client disconnected");
    } else {
      req.log.error({ err }, "ask stream failed");
      send("error", { error: "The Hub could not complete this request." });
    }
  } finally {
    send("done", {});
    res.end();
  }
});

export default router;
