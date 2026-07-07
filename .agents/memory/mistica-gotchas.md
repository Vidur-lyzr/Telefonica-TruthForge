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

**Why:** these caused repeated typecheck failures during the Mística rebuild; the docs bundled at `node_modules/@telefonica/mistica/doc/` are the fastest reference.
**How to apply:** any time building or editing hub-ssot UI on Mística.
