# Tabs

**What & when:** Underline tab bar for switching between sibling views. Controlled or uncontrolled.

```jsx
<Tabs
  defaultValue="mobile"
  items={[
    { id: 'mobile', label: 'Mobile' },
    { id: 'fibre', label: 'Fibre', badge: 3 },
    { id: 'tv', label: 'TV', disabled: true },
  ]}
  onChange={(id) => setTab(id)}
/>
```

Each item: `{ id, label, badge?, disabled? }`. Active tab shows blue text + blue underline.
