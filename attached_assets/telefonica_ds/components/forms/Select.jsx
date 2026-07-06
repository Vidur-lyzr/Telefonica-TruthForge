import React from 'react';

/**
 * Telefónica Select — native select with the brand's outlined styling.
 * Pass <option> elements as children.
 */
export function Select({
  label,
  children,
  value,
  onChange,
  helperText,
  error = false,
  disabled = false,
  required = false,
  placeholder,
  id,
  name,
  className = '',
  ...rest
}) {
  const fid = id || name;
  const cls = ['tf-field', error ? 'is-error' : '', disabled ? 'is-disabled' : '', className]
    .filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {label && (
        <label className="tf-field__label" htmlFor={fid}>
          {label}{required && <span className="tf-field__req">*</span>}
        </label>
      )}
      <div className="tf-select-wrap">
        <select
          id={fid} name={name} className="tf-select"
          value={value} onChange={onChange} disabled={disabled} required={required}
          {...rest}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {children}
        </select>
        <span className="tf-select__chevron" aria-hidden="true" />
      </div>
      {helperText && <span className="tf-field__help">{helperText}</span>}
    </div>
  );
}
