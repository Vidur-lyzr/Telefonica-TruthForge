---
name: SSE proxy buffering
description: SSE endpoints hang in the browser unless the proxy is told not to buffer
---

# SSE streams need X-Accel-Buffering: no on Replit

SSE (`text/event-stream`) endpoints that work perfectly via `curl localhost:80`
can appear completely stuck in the browser (spinner never resolves, e.g. Ask
chat frozen on "Contacting the governed agent...") both in dev and deployed.

**Why:** the Replit reverse proxy buffers the response body by default, so the
browser receives nothing until the whole response ends. `curl` still works
because it reads to completion; the browser's streaming reader gets no
incremental frames.

**How to apply:** on every SSE route set `res.setHeader("X-Accel-Buffering",
"no")` alongside `Content-Type: text/event-stream`, `Cache-Control: no-cache,
no-transform`, `Connection: keep-alive`, then `res.flushHeaders()`. Verify by
curling through `$REPLIT_DEV_DOMAIN` (not localhost) and confirming frames
arrive at distinct timestamps.
