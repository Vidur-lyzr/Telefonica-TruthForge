import { Router, type IRouter } from "express";
import {
  TrackActivityBody,
  TrackActivityResponse,
  GetObservatoryOverviewResponse,
  ListObservatorySessionsResponse,
  ListObservatoryEventsResponse,
} from "@workspace/api-zod";
import { requireLyzr } from "../middlewares/requireLyzr";
import { observe, observeHeartbeat } from "../lib/observe";
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

// Everything below is the Lyzr-only read side.
router.get("/observatory/overview", requireLyzr, async (req, res) => {
  const includeLyzr = req.query.includeLyzr === "true";
  res.json(
    GetObservatoryOverviewResponse.parse({ users: await getObservatoryOverview(includeLyzr) }),
  );
});

router.get("/observatory/sessions", requireLyzr, async (req, res) => {
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

router.get("/observatory/events", requireLyzr, async (req, res) => {
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

export default router;
