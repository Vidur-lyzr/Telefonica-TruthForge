import { Router, type IRouter } from "express";
import {
  AskBody,
  AskResponse,
  ExportAskDocumentBody,
  ExportAskDocumentPackBody,
} from "@workspace/api-zod";
import { runAskAgent, type AskStreamEvent } from "../agent/askAgent";
import { getAskDocument } from "../data/askDocuments";
import {
  exportDraft,
  exportPack,
  ExportRefusedError,
  type ExportDestination,
} from "../export/exportService";
import type { ExportFormat } from "../export/exportTemplates";
import {
  effectiveTemplate as getExportTemplate,
  effectiveDefaultTemplateForShape as defaultTemplateForShape,
} from "../data/templateOverrides";
import { requireCapability } from "../data/accessControl";
import { isQuotaError } from "../data/userUsage";
import { respondIfQuotaError } from "../lib/quotaHttp";
import { observe } from "../lib/observe";
import type { AskAgentResult } from "../agent/askAgent";

const router: IRouter = Router();

function observeAskTurn(
  req: Parameters<typeof observe>[0],
  question: string,
  roleId: string,
  result: AskAgentResult,
): void {
  observe(req, {
    kind: "ask",
    page: "/ask",
    roleId,
    summary: question,
    response: result.answer,
    status: result.status,
    docIds: [...new Set(result.citations.map((c) => c.docId))],
    retrievalAuditId: result.auditId ?? null,
  });
}

router.post("/ask", async (req, res) => {
  const parsed = AskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  if (!requireCapability(req, res, "use_modules", "partial", parsed.data.roleId)) return;

  try {
    const result = await runAskAgent(parsed.data, req.log);
    observeAskTurn(req, parsed.data.question, parsed.data.roleId, result);
    const data = AskResponse.parse(result);
    res.json(data);
    return;
  } catch (err) {
    if (respondIfQuotaError(err, res)) return;
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
  // Guard BEFORE the stream opens so a blocked persona gets a clean 403 JSON
  // refusal instead of an SSE channel.
  if (!requireCapability(req, res, "use_modules", "partial", parsed.data.roleId)) return;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Tell the reverse proxy (nginx-style) not to buffer the stream — without
  // this the browser receives nothing until the response ends, so the run
  // appears stuck on "Contacting the governed agent...".
  res.setHeader("X-Accel-Buffering", "no");
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
    observeAskTurn(req, parsed.data.question, parsed.data.roleId, result);
    send("result", AskResponse.parse(result));
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      req.log.info("ask stream cancelled: client disconnected");
      observe(req, {
        kind: "ask",
        page: "/ask",
        roleId: parsed.data.roleId,
        summary: parsed.data.question,
        status: "cancelled",
      });
    } else if (isQuotaError(err)) {
      req.log.info({ email: err.email }, "ask stream refused: quota exceeded");
      send("error", { error: err.message, code: err.code });
    } else {
      req.log.error({ err }, "ask stream failed");
      send("error", { error: "The Hub could not complete this request." });
    }
  } finally {
    send("done", {});
    res.end();
  }
});

// Full content of an Ask-generated document for the workspace artifact panel.
// Serves the server-registered draft's sections and citations — never model
// chat text. Content is served even when the Guardian blocked the draft (the
// panel shows the findings); downloads stay gated by the export routes below.
router.get("/ask/documents/:documentId/preview", (req, res) => {
  const record = getAskDocument(req.params.documentId);
  if (!record) {
    res.status(404).json({
      error:
        "This document is no longer available (chat documents do not survive a server restart). Ask for it again in the conversation.",
    });
    return;
  }
  const draft = record.draft;
  const template =
    getExportTemplate(draft.templateId) ?? defaultTemplateForShape(draft.shape);
  res.json({
    id: record.id,
    title: draft.title,
    shape: draft.shape,
    templateName: template.name,
    status: draft.status,
    guardianStatus: draft.guardian.status,
    guardianSummary: draft.guardian.summary,
    guardianFindings: draft.guardian.findings,
    formats: template.formats,
    language: draft.language,
    audience: draft.audience,
    confidentiality: draft.confidentiality,
    historic: draft.historic,
    note: draft.historicNote ?? draft.note ?? null,
    sections: draft.sections,
    citations: draft.citations,
    createdAt: record.createdAt,
  });
});

// Download one format of a document the doc-gen Superflow registered during an
// Ask turn. The full export governance stack (Guardian re-run, destination
// gates, external stripping) runs server-side — a chat-born document obeys
// exactly the same rules as a Generate export.
router.post("/ask/documents/export", async (req, res) => {
  const parsed = ExportAskDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const record = getAskDocument(parsed.data.documentId);
  if (!record) {
    res.status(404).json({
      error:
        "This document is no longer available (chat documents do not survive a server restart). Ask for it again in the conversation.",
    });
    return;
  }
  const format = parsed.data.format as ExportFormat;
  const destination =
    (parsed.data.destination as ExportDestination | undefined) ?? "internal";
  try {
    const result = await exportDraft(record.draft, format, destination, null);
    req.log.info(
      { documentId: record.id, format, destination, bytes: result.buffer.length },
      "ask document exported",
    );
    observe(req, {
      kind: "export",
      page: "/ask",
      summary: record.draft.title,
      docIds: [record.id],
      detail: { format, destination, source: "ask_document" },
    });
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (err) {
    if (err instanceof ExportRefusedError) {
      const status = err.code === "not_exportable" ? 400 : 409;
      res.status(status).json({ error: err.message, code: err.code });
      return;
    }
    req.log.error({ err }, "ask document export failed");
    res.status(500).json({ error: "The Hub could not export this document." });
  }
});

router.post("/ask/documents/export-pack", async (req, res) => {
  const parsed = ExportAskDocumentPackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const record = getAskDocument(parsed.data.documentId);
  if (!record) {
    res.status(404).json({
      error:
        "This document is no longer available (chat documents do not survive a server restart). Ask for it again in the conversation.",
    });
    return;
  }
  const formats = (parsed.data.formats ?? []) as ExportFormat[];
  const destination =
    (parsed.data.destination as ExportDestination | undefined) ?? "internal";
  try {
    const result = await exportPack(record.draft, formats, destination, null);
    req.log.info(
      { documentId: record.id, formats, destination, bytes: result.buffer.length },
      "ask document pack exported",
    );
    observe(req, {
      kind: "export",
      page: "/ask",
      summary: record.draft.title,
      docIds: [record.id],
      detail: { format: formats.join(","), destination, source: "ask_document_pack" },
    });
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (err) {
    if (err instanceof ExportRefusedError) {
      const status = err.code === "not_exportable" ? 400 : 409;
      res.status(status).json({ error: err.message, code: err.code });
      return;
    }
    req.log.error({ err }, "ask document pack export failed");
    res.status(500).json({ error: "The Hub could not export this document pack." });
  }
});

export default router;
