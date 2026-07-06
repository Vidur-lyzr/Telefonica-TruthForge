# Button

**What & when:** The Telefónica pill button — use for every action; exactly one solid-blue `primary` per view, `secondary` (outline) for the rest.

```jsx
<Button variant="primary" size="md">Discover more</Button>
<Button variant="secondary" iconLeft={<IconArrow/>}>Learn more</Button>
<Button variant="link">See all plans</Button>
<Button variant="primary" loading>Sending…</Button>
```

**Variants:** `primary` (solid blue), `secondary` (blue outline), `danger` (red), `link` (inline text), `inverse` (white, for blue/navy backgrounds).
**Sizes:** `sm` 32 · `md` 44 · `lg` 52. Props: `block`, `loading`, `disabled`, `iconLeft`, `iconRight`, `href` (renders an `<a>`).
