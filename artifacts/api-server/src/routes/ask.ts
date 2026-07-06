import { Router, type IRouter } from "express";
import { AskBody, AskResponse } from "@workspace/api-zod";
import { runAskAgent } from "../agent/askAgent";

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

export default router;
