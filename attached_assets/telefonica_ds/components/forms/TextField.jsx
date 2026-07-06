import React from 'react';

/**
 * Telefónica TextField — outlined input with label, helper and error states.
 * Supports prefix/suffix adornments (icon or text).
 */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  helperText,
  error = false,
  disabled = false,
  required = false,
  prefix = null,
  suffix = null,
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
      <div className="tf-input-wrap">
        {prefix && <span className="tf-input__affix">{prefix}</span>}
        <input
          id={fid} name={name} className="tf-input" type={type}
          value={value} onChange={onChange} placeholder={placeholder}
          disabled={disabled} required={required}
          aria-invalid={error || undefined}
          {...rest}
        />
        {suffix && <span className="tf-input__affix">{suffix}</span>}
      </div>
      {helperText && <span className="tf-field__help">{helperText}</span>}
    </div>
  );
}
