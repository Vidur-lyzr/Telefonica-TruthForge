---
name: Tailwind v4 strips raw CSS @import for web fonts
description: Why a Google Fonts @import in index.css silently fails under Tailwind v4, and how to load web fonts reliably.
---

A raw `@import url('https://fonts.googleapis.com/...')` placed in a Tailwind v4 stylesheet (the file that also does `@import "tailwindcss";`) is silently stripped from the compiled CSS.

**Why:** Tailwind v4 inlines `@import "tailwindcss"` (thousands of lines, including `@property` rules) BEFORE your font `@import` in the compiled bundle. CSS requires `@import` to precede all other statements, so PostCSS emits `[vite:css][postcss] @import must precede all other statements` and drops the font import. Reordering it above `@plugin`/other lines in source does NOT help — the inlined Tailwind content still lands ahead of it. The font never loads and the app falls back to the next family in the stack, with no runtime/JS error.

**How to apply:** Load web fonts via a `<link rel="stylesheet">` in `index.html`, not via a CSS `@import`. Keep the `font-family` token stack in CSS (e.g. `--app-font-sans: 'Hanken Grotesk', ...`) but ensure the actual `@font-face` comes from the HTML link. To verify: fetch the compiled CSS (`curl "<dev>/src/index.css?direct"`) and confirm zero `googleapis`/`@import url` refs, and check the vite log has no "@import must precede" warning after a fresh restart.

**Extra gotcha:** scaffolds may ship with the wrong font linked in `index.html` (e.g. Inter) even though the CSS names a different brand font — the app looks "styled" but is in the wrong typeface. Always check the `index.html` font link matches the DS font.
