---
name: telefonica-design
description: Use this skill to generate well-branded interfaces and assets for Telefónica (corporate — the vivid-blue five-dot identity), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Fast start
- **Tokens & type presets:** link `styles.css` (or copy `tokens/` + `fonts/`). Use CSS custom properties — never hard-code hexes. Brand blue is `--tf-blue` / `#0066FF`; deep navy `--tf-navy` / `#001B41`.
- **Components:** the compiled bundle is `_ds_bundle.js`; read components from `window.TelefNicaDesignSystem_29ea10` (e.g. `const { Button, Card, Tag, Tabs } = window.TelefNicaDesignSystem_29ea10`). Each `components/**/*.prompt.md` shows usage.
- **Reference screens:** `ui_kits/website/` (corporate home) and `slides/` (six 16:9 slide types) are copy-ready starting points.

## Non-negotiable brand rules
- One sans everywhere; **bold display with tight negative tracking**; sentence case (ALL-CAPS only for tracked eyebrows).
- **Pill** buttons/chips; 8px inputs/small cards; 16px media; circular avatars.
- White + one/two blues per view; navy for dark bands; semantic colours sparingly; **no emoji** in corporate contexts.
- Calm motion (120–320ms, standard ease, no bounce); soft, sparing shadows; hairline borders; 3px blue focus ring.

## Known substitutions (flag to the user)
- Font: **Hanken Grotesk** stands in for proprietary *Telefónica Sans* (TT Hoves).
- Logo: the **real** five-dot lockup is shipped — `assets/telefonica-logo.png` (blue) on light, `assets/telefonica-logo-white.png` on dark.
- Icons: `assets/icons.js` (`window.TFIcons`) are Lucide-style placeholders for the real `mistica-icons`.
