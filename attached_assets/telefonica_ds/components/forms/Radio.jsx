import React from 'react';

/**
 * Telefónica Radio — round control. Group several with the same `name`.
 */
export function Radio({
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
  const cls = ['tf-radio', disabled ? 'is-disabled' : '', className].filter(Boolean).join(' ');
  return (
    <label className={cls}>
      <input
        type="radio" checked={checked} defaultChecked={defaultChecked}
        onChange={onChange} disabled={disabled} name={name} value={value} {...rest}
      />
      {label && <span className="tf-radio__label">{label}</span>}
    </label>
  );
}
