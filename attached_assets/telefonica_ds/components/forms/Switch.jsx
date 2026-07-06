import React from 'react';

/** Telefónica Switch — on/off toggle. Track turns blue when on. */
export function Switch({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  name,
  className = '',
  ...rest
}) {
  const cls = ['tf-switch', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return (
    <label className={cls}>
      <input
        type="checkbox" role="switch" checked={checked} defaultChecked={defaultChecked}
        onChange={onChange} disabled={disabled} name={name} {...rest}
      />
      <span className="tf-switch__track"><span className="tf-switch__thumb" /></span>
      {label && <span className="tf-switch__label">{label}</span>}
    </label>
  );
}
