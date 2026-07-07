# Telefónica design system — brand contract (MANDATORY)

This app is built 100% on the **official Mística React library**
(`@telefonica/mistica`, Telefónica skin). Mística is the single source of design
truth — do NOT invent tokens, hardcode colors/font sizes/radii, or reintroduce
Tailwind/shadcn/lucide (all removed).

## How theming works

- `src/main.tsx` imports `@telefonica/mistica/css/mistica.css` before `src/index.css`.
- `src/App.tsx` wraps the app in `ThemeContextProvider` with `getTelefonicaSkin()`
  (light color scheme). A small `GlobalStyles` block sets the body font stack
  (`'Telefonica Sans', 'Hanken Grotesk', ...`) and the background token.
- `src/index.css` contains only a minimal reset. **Never add colors, font sizes,
  or radii there.**

## Non-negotiable rules

- All colors via `skinVars.colors.*`; alpha via `applyAlpha(skinVars.rawColors.X, a)`.
  No hex literals anywhere (including recharts and SVG). Exception: strategic-axis
  colors come from the `/axes` API (`StrategicAxis.color`) — prefer the API value
  when rendering a specific axis, fallback `skinVars.colors.brand`.
- All radii via `skinVars.borderRadii.*`.
- All typography via Mística text components (`Text1`–`Text8`, `Title1`–`Title4`).
  Never set font-size/weight manually.
- Layout via Mística primitives: `Box`, `Stack`, `Inline`, `Grid`, `Boxed`,
  `Divider`, `ResponsiveLayout`, `Circle`. Raw `<div>` only for structural
  flex/grid scaffolding that primitives cannot express, styled exclusively with
  skinVars tokens. `Stack`/`Inline` space and `Grid` gap accept only Mística's
  numeric steps (0, 2, 4, 8, 12, 16, 24, 32, 40, 48, ...) — never 6 or 20.
- Components: `ButtonPrimary/Secondary/Link`, `IconButton`, `Tag` (string children
  only), `Chip`, `Callout` (icon via `asset` prop), `Tabs`, `TextField`/`Select`/
  `Switch`, `Drawer`/`Sheet` (conditional render + `onClose`/`onDismiss`, no
  shadcn-style `open` prop), `Table`, `EmptyStateCard`, `Spinner`/`Skeleton*`,
  Mística icons (`Icon*Regular`).
- Dark/navy bands (sidebar, hero panels) use `ThemeVariant variant="brand"` with
  `skinVars.colors.navigationBarBackground` — Mística text/icons adapt automatically.
- **Sentence case** headings. **No emoji anywhere.** Calm motion only
  (120–320ms, standard easing, no bounce).
- recharts is allowed for charts, but every chart color must come from skinVars.
- Namespace React hooks (`React.useState`, etc.) in new code.

## App shell

- Collapsible sidebar (272px expanded / 76px collapsed, 200ms) with the Mística
  `Logo` at the top (`imagotype` expanded, `isotype` collapsed) and a
  chevron-double `IconButton` toggle. Nav items are `Touchable` rows with
  Mística icons.
- The sidebar is WHITE (`backgroundContainer` + `divider` right border), matching
  the default Mística web navigation — not the blue inverse variant. Active item:
  `brandLow` background with `brand` text/icon. This was a deliberate user
  decision; do not switch it back to solid blue.
- Topbar: product name plus Area/Persona Mística `Select`s.

## Reference docs

Bundled Mística LLM docs (read before building any UI):
`node_modules/@telefonica/mistica/doc/` — `patterns.md`, `components.md`,
`layout.md`, `design-tokens.md`, plus `llms/llms.md`.
