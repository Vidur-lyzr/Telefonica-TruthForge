// One-shot proof of the extracted-layout compiler seam (Task #102 P1):
// hand-author a spec, validate + compile it, verify the runtime Zod schema
// enforces limits, verify z.toJSONSchema works on the compiled schema (the
// agent catalogue depends on it), and compose ops with sample slot values.
// Pure compiler check — no DB, no server.

import { z } from "zod/v4";
import {
  parseExtractedLayoutSpec,
  compileExtractedLayout,
} from "../export/extractedLayouts";
import { THEME_COLORS } from "../export/exportTheme";

const sampleSpec = {
  specVersion: 1,
  id: "xl-proof-split-stat",
  name: "Proof split with stat band",
  purpose:
    "Left text column with headline and supporting bullets, right image panel, navy stat band along the bottom. Use for a single message backed by one figure.",
  footer: "light",
  background: [
    { op: "rect", x: 0, y: 0, w: 13.33, h: 7.5, fill: THEME_COLORS.background },
    { op: "rect", x: 0, y: 6.1, w: 13.33, h: 1.4, fill: THEME_COLORS.navy },
    { op: "line", x: 0.5, y: 1.7, w: 5.8, color: THEME_COLORS.brand, pt: 2 },
    { op: "mark", color: THEME_COLORS.brand, x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
  slots: [
    {
      key: "title",
      kind: "text",
      label: "Headline",
      required: true,
      frame: { x: 0.5, y: 0.75, w: 5.8, h: 0.9 },
      size: 26,
      color: THEME_COLORS.textPrimary,
      bold: true,
      maxChars: 80,
    },
    {
      key: "points",
      kind: "bullets",
      label: "Supporting points",
      required: true,
      frame: { x: 0.5, y: 2.0, w: 5.8, h: 3.6 },
      size: 14,
      color: THEME_COLORS.textSecondary,
      maxItems: 4,
      maxCharsPerItem: 110,
    },
    {
      key: "statLine",
      kind: "text",
      label: "Stat band line",
      required: false,
      frame: { x: 0.5, y: 6.45, w: 12.33, h: 0.7 },
      size: 18,
      color: THEME_COLORS.inverse,
      bold: true,
      maxChars: 90,
    },
    {
      key: "sideImage",
      kind: "image",
      label: "Right panel image",
      required: false,
      frame: { x: 6.8, y: 0, w: 6.53, h: 6.1 },
      hint: "Vertical or square photo matching the message (tags like network, city, people).",
    },
  ],
} as const;

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

// 1. Meta-schema validation + compile.
const spec = parseExtractedLayoutSpec(sampleSpec);
const layout = compileExtractedLayout(spec);
if (layout.id !== "xl-proof-split-stat") fail("compiled id mismatch");
if (layout.imageSlots.length !== 1 || layout.imageSlots[0].slot !== "sideImage")
  fail("image slots not derived");

// 2. Runtime schema enforces limits and strictness.
const good = layout.schema.safeParse({
  title: "Fibre rollout stays ahead of plan",
  points: ["Coverage reached 82 percent of target regions", "Cost per home passed fell again"],
  statLine: "82% coverage - 12 months early",
});
if (!good.success) fail(`valid slots rejected: ${JSON.stringify(good.error.issues[0])}`);
const tooLong = layout.schema.safeParse({
  title: "x".repeat(81),
  points: ["ok item one", "ok item two"],
});
if (tooLong.success) fail("maxChars not enforced");
const unknownKey = layout.schema.safeParse({
  title: "ok",
  points: ["ok item one", "ok item two"],
  rogue: "nope",
});
if (unknownKey.success) fail("strict() not enforced");
const missingRequired = layout.schema.safeParse({ title: "ok" });
if (missingRequired.success) fail("required slot not enforced");

// 3. Agent catalogue dependency: plain JSON schema conversion must work.
const js = z.toJSONSchema(layout.schema, { io: "input" });
if (!js || typeof js !== "object" || !("properties" in js)) fail("toJSONSchema failed");

// 4. Compose produces ops: background + slots + footer, honest image fallback.
const ops = layout.compose(good.data as Record<string, unknown>, {
  images: { sideImage: null },
  footerLabel: "Proof deck",
  confidentiality: "Internal",
  generatedAt: new Date().toISOString(),
});
const kinds = ops.map((o) => o.op);
if (!kinds.includes("rect") || !kinds.includes("line") || !kinds.includes("mark"))
  fail("background ops missing");
if (!kinds.includes("text")) fail("slot text ops missing");
const bulletsOp = ops.find((o) => o.op === "text" && o.text.includes("\n"));
if (!bulletsOp) fail("bullets did not render as multiline text");
// No image resolved → fallback panel (rect + mark), never an image op.
if (kinds.includes("image")) fail("image op emitted without resolved image");
const footerOps = ops.filter((o) => o.op === "text" && o.text.startsWith("Telefónica"));
if (footerOps.length !== 1) fail("footer missing");

console.log(
  JSON.stringify(
    {
      ok: true,
      layoutId: layout.id,
      opCount: ops.length,
      imageSlots: layout.imageSlots.length,
      jsonSchemaKeys: Object.keys((js as { properties: Record<string, unknown> }).properties),
    },
    null,
    2,
  ),
);
