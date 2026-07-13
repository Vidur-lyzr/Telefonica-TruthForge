---
name: Mística React library gotchas
description: Non-obvious API constraints of @telefonica/mistica learned during the full frontend rebuild
---

# Mística (@telefonica/mistica) gotchas

- `Stack`/`Inline` `space` and `Grid` `gap` accept only fixed steps (0, 2, 4, 8, 12, 16, 24, 32, 40, 48…) — 6 and 20 are type errors.
- `Touchable` has no `title` or `disabled` prop; guard inside `onPress` instead. `onPress` must return void (no `cond && fn()` shorthand).
- `IconButton` uses `type="brand"`, not `"primary"`.
- `Callout` takes its icon via `asset`, not `icon`.
- `Tag` children must be plain strings.
- `Drawer` has no `open` prop — render conditionally and use `onClose`/`onDismiss`.
- Dark bands: wrap in `ThemeVariant variant="brand"`; text/icons adapt automatically.
- `Menu` icon typing needs `(props: IconProps) => JSX.Element`.
- `skinVars.borderRadii.avatar` is `"50%"` — use it instead of a literal `"50%"` for circular dots.
- Lock icon is `IconLockClosedRegular` (there is no `IconLockRegular`).
- `Text` components break words mid-word by default (segmented toggles render "Mont h"); parent `white-space: nowrap` does NOT stop it — pass `wordBreak={false}` on the Text itself.

**Why:** these caused repeated typecheck failures during the Mística rebuild; the docs bundled at `node_modules/@telefonica/mistica/doc/` are the fastest reference.
**How to apply:** any time building or editing hub-ssot UI on Mística.

- Sheet inside an open Drawer looks broken: Sheet renders centered with a built-in top-right close icon that collides with any top-right content (tags). For citation/source detail popups use a stacked Drawer (the ask.tsx CitationDrawer pattern, later-mounted portal stacks on top); status text/strokes should use *High tokens (success/warning/error base tokens are soft fill variants).
