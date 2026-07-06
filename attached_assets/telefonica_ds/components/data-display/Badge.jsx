import React from 'react';

/**
 * Telefónica Badge — a numeric counter or a simple dot. Use `max` to cap
 * large counts (e.g. 99+).
 */
export function Badge({ count, dot = false, max = 99, className = '', ...rest }) {
  const cls = ['tf-badge', dot ? 'tf-badge--dot' : '', className].filter(Boolean).join(' ');
  if (dot) return <span className={cls} {...rest} />;
  const label = typeof count === 'number' && count > max ? `${max}+` : count;
  return <span className={cls} {...rest}>{label}</span>;
}
