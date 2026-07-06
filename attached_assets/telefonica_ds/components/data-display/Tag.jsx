import React from 'react';

/**
 * Telefónica Tag — small status pill. Set `dot` to show a leading indicator.
 */
export function Tag({
  children,
  variant = 'info',  // promo | success | warning | error | info | inactive
  dot = false,
  className = '',
  ...rest
}) {
  const cls = ['tf-tag', `tf-tag--${variant}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      {dot && <span className="tf-tag__dot" />}
      {children}
    </span>
  );
}
