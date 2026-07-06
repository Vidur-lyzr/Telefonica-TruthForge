# Callout · ProgressBar

**Callout** — inline banner. Variants `info · success · warning · error`.
```jsx
<Callout variant="success" title="Payment received"
         onClose={()=>{}}>Your invoice is settled.</Callout>
<Callout variant="warning" title="Data almost used"
         action={<Button size="sm" variant="secondary">Add data</Button>}>
  You have 400 MB left this month.
</Callout>
```

**ProgressBar** — determinate 0–100.
```jsx
<ProgressBar value={68} label="Data used" showValue />
```
