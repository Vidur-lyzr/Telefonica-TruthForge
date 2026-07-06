# Card · Tag · Badge · Avatar

**Card** — content card with optional media, eyebrow, title, description, footer. Interactive on `href`.
```jsx
<Card media="/img/5g.jpg" eyebrow="Networks" title="5G everywhere"
      description="Ultra-low latency across 2,000 towns."
      footer={<Button variant="link">Read more →</Button>} href="#" />
```

**Tag** — status pill: `promo · success · warning · error · info · inactive`.
```jsx
<Tag variant="promo">New</Tag><Tag variant="success" dot>Active</Tag>
```

**Badge** — counter / dot, usually on an icon.
```jsx
<Badge count={128} max={99} /><Badge dot />
```

**Avatar** — image or initials; `sm md lg xl`.
```jsx
<Avatar initials="TF" size="lg" /><Avatar src="/u.jpg" alt="Ana" />
```
