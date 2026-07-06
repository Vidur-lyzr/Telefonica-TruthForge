import React from 'react';

/** Telefónica Checkbox — square control with a white tick on blue when checked. */
export function Checkbox({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  name,
  value,
  className = '',
  ...rest
}) {
  const cls = ['tf-check', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return (
    <label className={cls}>
      <input
        type="checkbox" checked={checked} defaultChecked={defaultChecked}
        onChange={onChange} disabled={disabled} name={name} value={value} {...rest}
      />
      {label && <span className="tf-check__label">{label}</span>}
    </label>
  );
}
