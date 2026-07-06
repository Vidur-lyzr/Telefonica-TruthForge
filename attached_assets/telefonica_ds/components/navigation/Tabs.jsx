import React, { useState } from 'react';

/**
 * Telefónica Tabs — underline tab bar. Controlled via `value`/`onChange`, or
 * uncontrolled with `defaultValue`. `items` is [{ id, label, badge?, disabled? }].
 */
export function Tabs({
  items = [],
  value,
  defaultValue,
  onChange,
  className = '',
  ...rest
}) {
  const [internal, setInternal] = useState(defaultValue ?? (items[0] && items[0].id));
  const active = value !== undefined ? value : internal;
  const select = (id) => {
    if (value === undefined) setInternal(id);
    if (onChange) onChange(id);
  };
  return (
    <div className={['tf-tabs', className].filter(Boolean).join(' ')} role="tablist" {...rest}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={active === it.id}
          disabled={it.disabled}
          className={['tf-tab', active === it.id ? 'tf-tab--active' : ''].filter(Boolean).join(' ')}
          onClick={() => select(it.id)}
        >
          {it.label}
          {it.badge != null && <span className="tf-tab__badge">{it.badge}</span>}
        </button>
      ))}
    </div>
  );
}
