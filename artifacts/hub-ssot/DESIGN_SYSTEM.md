# Telefónica design system — brand contract (MANDATORY)

This app MUST be built on the official Telefónica design system. The palette, type,
and shape rules below are a hard brand contract, not suggestions. `src/index.css`
already contains the full token set — build on those tokens, do NOT invent a new
palette or replace the tokens.

## Identity
Telefónica corporate — the vivid-blue five-dot "T" identity. Confident, precise,
calm, trustworthy. This is an enterprise governance tool for a global telco's
Communication & Brand teams.

## Non-negotiable brand rules
- One sans everywhere: **Hanken Grotesk** (already imported; stands in for the
  proprietary Telefónica Sans). Bold display with **tight negative tracking**
  (`letter-spacing: -0.02em` on display, `-0.01em` on titles).
- **Sentence case** for headings. ALL-CAPS only for small tracked eyebrows
  (`letter-spacing: 0.06em`).
- **Pill** shape for buttons and chips (`border-radius: 999px`). 8px radius for
  inputs and small cards, 16px for media/large cards, circular avatars.
- White / very-light-grey surfaces with **one or two blues per view**; **navy
  (#001B41) for dark bands** such as the left nav rail. Semantic colors used
  sparingly.
- Calm motion only: 120–320ms, standard easing, **no bounce**. Soft, sparing
  shadows; hairline borders; 3px blue focus ring (`0 0 0 3px rgba(0,102,255,0.35)`).
- **No emoji anywhere.**

## Color tokens (already defined in src/index.css)
Brand: `--tf-blue #0066FF`, `--tf-blue-hover #0047B3`, `--tf-blue-tint #E6F0FF`,
`--tf-navy #001B41`, `--tf-navy-tint #0A2A5E`, `--tf-accent-teal #00C1B5`,
`--tf-accent-purple #7D5CFF`.
Greys: `--tf-grey-50 #F8F8FB` … `--tf-grey-900 #1B1B25`.
Semantic: success `#1AB759` (+bg `#E6F7EE`), warning `#FFB800` (+bg `#FFF6E0`),
error `#FF4133` (+bg `#FFE9E7`), info `#0066FF` (+bg `#E6F0FF`).
Five strategic-axis colors (use for axis pills / charts, exposed as Tailwind
utilities `bg-axis-1`…`bg-axis-5` and `text-axis-*`):
`--axis-1 #0066FF`, `--axis-2 #00C1B5`, `--axis-3 #7D5CFF`, `--axis-4 #FF7A00`,
`--axis-5 #E5406B`. NOTE: each axis also carries its color from the `/axes` API
(`StrategicAxis.color`) — prefer the API color when rendering a specific axis so
server and UI stay in sync; the CSS vars are the same values as a fallback.

Tailwind utilities available for brand colors: `bg-tf-blue`, `text-tf-navy`,
`bg-tf-blue-tint`, `bg-tf-success-bg`, `text-tf-success`, `bg-tf-warning-bg`,
`text-tf-warning`, `bg-tf-error-bg`, `text-tf-error`, `bg-tf-info-bg`, etc. The
shadcn semantic tokens (`bg-primary`, `bg-sidebar`, `text-muted-foreground`, …)
are all mapped to Telefónica values, so normal shadcn components render on-brand.

## Type scale (px)
display-xl 72/76, display-lg 56/60, display-md 44/50, display-sm 34/40,
title-lg 28/34, title-md 22/28, title-sm 18/24, body-lg 18/28, body-md 16/24,
body-sm 14/20, caption 12/16. Weights: regular 400, medium 500, bold 700.

## Radius / elevation
radius: sm 4px, md 8px, lg 16px, xl 24px, pill 999px. Utilities `rounded-sm/md/lg/xl`
map to these. Shadows: `--shadow-xs/sm/md/lg/xl` and `--shadow-brand`
(`0 8px 24px rgba(0,102,255,0.28)`) already defined.

## Logo assets (in src/assets/)
- `telefonica-logo.png` — full blue five-dot lockup, use on light surfaces.
- `telefonica-logo-white.png` — white lockup, use on navy/blue bands.
The top bar shows the dot-"T" mark + the product name "Hub SSoT". Import with
`import logo from "@/assets/telefonica-logo.png"`.

## Icons
Use `lucide-react` (already installed) — the DS uses Lucide-style icons. Keep them
thin, 1.5–2px stroke, sized 16–20px inline.

## Component style cues (from the DS kit — reproduce with shadcn/Tailwind)
- Buttons: pill. Exactly one solid-blue `primary` per view; the rest are outline
  (`secondary`). Sizes: sm 32px, md 44px, lg 52px tall. Also `danger` (red),
  `link` (inline blue text), and `inverse` (white, for use on navy/blue bands).
- Tags: status pills — promo, success, warning, error, info, inactive; optional
  leading dot.
- Cards: white, hairline border, soft shadow, optional media (16px radius),
  eyebrow (tracked caps), title, description, footer.
- Tabs, TextField (outlined, label + helper + error), Select, Switch, Checkbox,
  Radio, Callout, ProgressBar, Avatar (circular) all follow the same calm,
  hairline, pill/8px aesthetic.
