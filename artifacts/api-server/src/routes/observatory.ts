import { Router, type IRouter } from "express";
import {
  TrackActivityBody,
  TrackActivityResponse,
  GetObservatoryOverviewResponse,
  ListObservatorySessionsResponse,
  ListObservatoryEventsResponse,
} from "@workspace/api-zod";
import { requireAuditTeam } from "../middlewares/requireAuditTeam";
import { observe, observeHeartbeat } from "../lib/observe";
import { getAuditExportAsset } from "../export/auditAssets";
import {
  getObservatoryOverview,
  getObservatorySessions,
  queryObservatoryEvents,
  type ObservatoryEventKind,
} from "../data/observatoryStore";

const router: IRouter = Router();

// Activity beacon — any authenticated user. Identity comes exclusively from
// the verified session (requireAuth ran upstream); the body only says which
// page the user is on.
router.post("/track", (req, res) => {
  const parsed = TrackActivityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const page = parsed.data.page ?? null;
  if (parsed.data.kind === "page_view") {
    observe(req, { kind: "page_view", page });
  } else {
    observeHeartbeat(req, page);
  }
  res.json(TrackActivityResponse.parse({ ok: true }));
});

// Everything below is the audit-team (lyzr + accenture) read side.
router.get("/observatory/overview", requireAuditTeam, async (_req, res) => {
  res.json(
    GetObservatoryOverviewResponse.parse({ users: await getObservatoryOverview() }),
  );
});

router.get("/observatory/sessions", requireAuditTeam, async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email : "";
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  res.json(
    ListObservatorySessionsResponse.parse({ sessions: await getObservatorySessions(email) }),
  );
});

const EVENT_KINDS: ObservatoryEventKind[] = [
  "login",
  "logout",
  "page_view",
  "ask",
  "generate",
  "export",
  "download",
  "ingest",
  "config_change",
];

router.get("/observatory/events", requireAuditTeam, async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email : null;
  const sid = typeof req.query.sid === "string" ? req.query.sid : null;
  const rawKind = typeof req.query.kind === "string" ? req.query.kind : null;
  const kind = EVENT_KINDS.includes(rawKind as ObservatoryEventKind)
    ? (rawKind as ObservatoryEventKind)
    : null;
  const limit = Number.parseInt(String(req.query.limit ?? ""), 10);
  const offset = Number.parseInt(String(req.query.offset ?? ""), 10);
  const page = await queryObservatoryEvents({
    email,
    sid,
    kind,
    limit: Number.isFinite(limit) ? limit : undefined,
    offset: Number.isFinite(offset) ? offset : undefined,
  });
  res.json(ListObservatoryEventsResponse.parse(page));
});

// Streams the stored audit copy of an exported file — the exact bytes the
// user downloaded. The asset id comes from an export event's detail; unknown
// or malformed ids 404 (assets predating this feature have no stored copy).
router.get(
  "/observatory/export-assets/:assetId/file",
  requireAuditTeam,
  async (req, res) => {
    try {
      const asset = await getAuditExportAsset(String(req.params.assetId ?? ""));
      if (!asset) {
        res.status(404).json({
          error: "No stored file for this export (it may predate file retention).",
        });
        return;
      }
      res.setHeader("Content-Type", asset.contentType);
      res.setHeader("Content-Disposition", asset.contentDisposition);
      if (asset.size !== null) res.setHeader("Content-Length", String(asset.size));
      asset.stream.on("error", (err) => {
        req.log.error({ err }, "audit export asset stream failed");
        if (!res.headersSent) {
          res.status(500).json({ error: "Could not read the stored export file." });
        } else {
          res.destroy();
        }
      });
      asset.stream.pipe(res);
    } catch (err) {
      req.log.error({ err }, "audit export asset route failed");
      res.status(500).json({ error: "Could not read the stored export file." });
    }
  },
);

export default router;
