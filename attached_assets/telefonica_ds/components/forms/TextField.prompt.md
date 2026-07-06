# TextField

**What & when:** Standard single-line text input for forms. Outlined, with label above, optional helper/error and prefix/suffix adornments.

```jsx
<TextField label="Email" type="email" placeholder="you@telefonica.com" required />
<TextField label="Amount" prefix="€" suffix={<IconCheck/>} helperText="Incl. VAT" />
<TextField label="Password" type="password" error helperText="Too short" />
```

Props: `label`, `helperText`, `error`, `prefix`, `suffix`, plus all native input attributes.
