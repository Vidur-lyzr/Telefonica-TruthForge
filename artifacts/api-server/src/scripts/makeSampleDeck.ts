// Generates a multi-layout sample "master deck" for exercising the deck
// extraction pipeline end to end. Twelve slides across four deliberate
// layout families (cover, title+bullets, title+image-right, statement),
// with embedded raster images large enough to qualify for harvest.
//
//   pnpm --filter @workspace/api-server run deck:sample [outPath]
//
// Default output: /tmp/sample-master-deck.pptx

import fs from "fs";
import { createRequire } from "module";
import { Resvg } from "@resvg/resvg-js";

// pptxgenjs is CJS; tsx's ESM loader does not surface its default export.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PptxGenJS = require("pptxgenjs") as typeof import("pptxgenjs").default;

const OUT = process.argv[2] ?? "/tmp/sample-master-deck.pptx";

// Busy, photo-ish SVGs so the PNGs clear the harvest size floor (8 KB).
function samplePng(seed: number): string {
  const parts: string[] = [];
  let v = seed * 2654435761;
  const rand = (): number => {
    v = (v * 1103515245 + 12345) % 2147483648;
    return v / 2147483648;
  };
  const palette = ["#0066FF", "#001B41", "#E5F0FF", "#6E7894", "#F5F9FF", "#8F5C00"];
  for (let i = 0; i < 220; i++) {
    const cx = Math.round(rand() * 800);
    const cy = Math.round(rand() * 600);
    const r = Math.round(6 + rand() * 60);
    const fill = palette[Math.floor(rand() * palette.length)]!;
    const opacity = (0.25 + rand() * 0.75).toFixed(2);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" fill-opacity="${opacity}"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#FFFFFF"/>${parts.join("")}</svg>`;
  const png = Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: 800 } }).render().asPng());
  return `image/png;base64,${png.toString("base64")}`;
}

async function main(): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";

  const images = [samplePng(1), samplePng(2), samplePng(3)];

  // ---- Family A: covers (2 slides) — navy background, big centered title ----
  for (const [i, title] of ["Corporate strategy 2026", "Brand review — H1"].entries()) {
    const s = pptx.addSlide();
    s.background = { color: "001B41" };
    s.addText(title, {
      x: 1.5, y: 2.7, w: 10.33, h: 1.6,
      fontSize: 44, bold: true, color: "FFFFFF", align: "center",
    });
    s.addText(`Communication & Brand · volume ${i + 1}`, {
      x: 1.5, y: 4.4, w: 10.33, h: 0.6,
      fontSize: 18, color: "C7D6F0", align: "center",
    });
  }

  // ---- Family B: title + bullets (4 slides) --------------------------------
  const bulletSets = [
    ["Grow the core connectivity business", "Scale digital services revenue", "Simplify the operating model"],
    ["Launch the refreshed visual identity", "Roll out tone-of-voice training", "Consolidate agency roster"],
    ["Expand fibre coverage in key markets", "Accelerate B2B platform adoption", "Strengthen spectrum position"],
    ["Quarterly narrative alignment", "Executive visibility programme", "Always-on media monitoring"],
  ];
  for (const [i, bullets] of bulletSets.entries()) {
    const s = pptx.addSlide();
    s.addText(`Priority area ${i + 1}`, {
      x: 0.8, y: 0.6, w: 11.7, h: 1.0,
      fontSize: 30, bold: true, color: "031A34",
    });
    s.addShape("rect", { x: 0.8, y: 1.75, w: 2.2, h: 0.08, fill: { color: "0066FF" } });
    s.addText(
      bullets.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })),
      { x: 0.8, y: 2.2, w: 11.0, h: 4.2, fontSize: 18, color: "031A34" },
    );
  }

  // ---- Family C: title + image right (3 slides) ----------------------------
  for (let i = 0; i < 3; i++) {
    const s = pptx.addSlide();
    s.addText(`Market snapshot ${i + 1}`, {
      x: 0.8, y: 0.7, w: 5.6, h: 1.2,
      fontSize: 28, bold: true, color: "031A34",
    });
    s.addText(
      "Customer demand for converged services keeps climbing across our core markets, with churn at historic lows and satisfaction trending upward.",
      { x: 0.8, y: 2.1, w: 5.6, h: 3.6, fontSize: 15, color: "6E7894" },
    );
    s.addImage({ data: images[i]!, x: 7.0, y: 0.7, w: 5.5, h: 6.1 });
  }

  // ---- Family D: statement slides (3 slides) --------------------------------
  const statements = [
    "We connect people's lives.",
    "One brand, one voice, everywhere.",
    "Evidence first — every claim cited.",
  ];
  for (const q of statements) {
    const s = pptx.addSlide();
    s.background = { color: "E5F0FF" };
    s.addText(q, {
      x: 2.0, y: 2.9, w: 9.33, h: 1.7,
      fontSize: 36, bold: true, color: "0066FF", align: "center",
    });
    s.addShape("rect", { x: 5.67, y: 5.0, w: 2.0, h: 0.06, fill: { color: "001B41" } });
  }

  await pptx.writeFile({ fileName: OUT });
  const size = fs.statSync(OUT).size;
  process.stdout.write(`wrote ${OUT} (${size} bytes, 12 slides)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
