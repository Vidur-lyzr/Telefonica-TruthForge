// One-page PDF guide for slimming the corporate master deck before upload.
// Deterministic output (brand fonts, brand mark, theme colours) built once
// and cached — the content has no runtime inputs.

import PDFDocument from "pdfkit";
import { brandFontPath, brandMarkPng } from "./brandAssets";
import { THEME_COLORS } from "./exportTheme";

const BRAND = THEME_COLORS.brand;
const NAVY = THEME_COLORS.navy;
const TEXT = THEME_COLORS.textPrimary;
const MUTED = THEME_COLORS.textSecondary;

const F = "Brand";
const FB = "Brand-Bold";
const FM = "Brand-Medium";

const MARGIN = 56;

let cached: Buffer | null = null;

export async function slimmingGuidePdf(): Promise<Buffer> {
  if (cached) return cached;

  const doc = new PDFDocument({ size: "A4", margin: MARGIN });
  doc.registerFont(F, brandFontPath("regular"));
  doc.registerFont(FB, brandFontPath("bold"));
  doc.registerFont(FM, brandFontPath("medium"));

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const contentW = doc.page.width - MARGIN * 2;

  // Header — five-dot mark + title.
  doc.image(brandMarkPng(96, BRAND), MARGIN, MARGIN, { width: 48 });
  doc
    .font(FB)
    .fontSize(20)
    .fillColor(NAVY)
    .text("Preparing the master deck for extraction", MARGIN, MARGIN + 58, {
      width: contentW,
    });
  doc
    .font(F)
    .fontSize(10.5)
    .fillColor(MUTED)
    .text(
      "The Hub turns your corporate master deck into governed slide layouts the generate agent can use. " +
        "Uploads are capped at 100 MB per file, so most master decks need a quick slim-down first — " +
        "none of these steps touch your original file.",
      { width: contentW, lineGap: 2 },
    );
  doc.moveDown(1.2);

  const steps: { title: string; body: string }[] = [
    {
      title: "Work on a copy",
      body: "In PowerPoint, File > Save a Copy. Keep the original untouched.",
    },
    {
      title: "Compress embedded media",
      body:
        "File > Info > Compress Media > Standard quality (Windows). On Mac: File > Compress Pictures. " +
        "This alone usually removes most of the file size.",
    },
    {
      title: "Delete videos and audio",
      body:
        "Video and audio cannot become layouts and are ignored by extraction — deleting them costs nothing.",
    },
    {
      title: "Keep masters and layouts intact",
      body:
        "Do not flatten slides to pictures and do not strip the slide masters — the extractor reads real " +
        "text boxes, placeholders and geometry. A deck of screenshots yields image-only proposals.",
    },
    {
      title: "Split if still above 100 MB",
      body:
        "Save section-by-section copies (delete the other sections in each copy). Up to five parts can be " +
        "uploaded together as one extraction job.",
    },
    {
      title: "Prefer .pptx over PDF",
      body:
        "PPTX preserves editable geometry, so proposals are precise. A PDF export is accepted as a fallback, " +
        "but slides arrive as images only — expect image-focused proposals.",
    },
  ];

  steps.forEach((step, i) => {
    const y = doc.y;
    doc.font(FB).fontSize(11).fillColor(BRAND).text(`${i + 1}.`, MARGIN, y, { width: 22 });
    doc.font(FM).fontSize(11).fillColor(TEXT).text(step.title, MARGIN + 24, y, {
      width: contentW - 24,
    });
    doc.font(F).fontSize(10).fillColor(MUTED).text(step.body, MARGIN + 24, doc.y + 1, {
      width: contentW - 24,
      lineGap: 1.5,
    });
    doc.moveDown(0.7);
  });

  doc.moveDown(0.4);
  doc.font(FB).fontSize(12).fillColor(NAVY).text("What happens after upload", MARGIN, doc.y, {
    width: contentW,
  });
  doc
    .font(F)
    .fontSize(10)
    .fillColor(MUTED)
    .text(
      "The pipeline reads every slide, groups recurring designs into layout families and proposes a reusable " +
        "layout for each family. Nothing goes live automatically: every proposal waits for a Brand admin to " +
        "review and approve it, and harvested imagery only enters the brand library after the same review. " +
        "Every decision is audit-logged.",
      { width: contentW, lineGap: 2 },
    );

  doc.end();
  cached = await done;
  return cached;
}
