---
name: PDF export tooling
description: How to render PDFs in this environment (no headless browser) and pdfkit pagination gotchas.
---

# PDF export tooling

No pandoc, chromium, or puppeteer is available in this environment. PDF rendering is done with pdfkit (plus @resvg/resvg-js for SVG→PNG), loaded via `createRequire` pointed at `artifacts/api-server/package.json` since scripts has no own node_modules for them.

**pdfkit gotcha — footer text triggers auto-pagination:** writing text below the document's bottom margin (e.g. a manual footer at `PAGE_H - 40` while `margins.bottom` is 64) makes pdfkit silently add a new page, producing blank first pages, drifting page numbers, and "Restoring state" warnings from save/restore spanning the implicit page break.

**How to apply:** when managing page breaks manually (own `ensure(h)` helper + fixed BOTTOM constant), set the pdfkit document `margins.bottom` to a tiny value (~12) so pdfkit never paginates on its own.

Also: web fonts (Hanken Grotesk TTFs) must be fetched from Google Fonts css2 with a legacy UA (`Mozilla/4.0`) to get static TTF URLs; they live in /tmp/fonts and vanish on container restart.
