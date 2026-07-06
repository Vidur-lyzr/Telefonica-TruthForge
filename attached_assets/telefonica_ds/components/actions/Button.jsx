import React from 'react';

/**
 * Telefónica Button — pill-shaped, bold. The primary action is solid blue.
 * Renders as <button> by default, or <a> when `href` is provided.
 */
export function Button({
  children,
  variant = 'primary',   // primary | secondary | danger | link | inverse
  size = 'md',           // sm | md | lg
  block = false,
  loading = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  href,
  type = 'button',
  className = '',
  ...rest
}) {
  const cls = [
    'tf-btn',
    `tf-btn--${variant}`,
    `tf-btn--${size}`,
    block ? 'tf-btn--block' : '',
    loading ? 'is-loading' : '',
    className,
  ].filter(Boolean).join(' ');

  const Tag = href ? 'a' : 'button';
  const tagProps = href
    ? { href, 'aria-disabled': disabled || loading ? 'true' : undefined }
    : { type, disabled: disabled || loading };

  return (
    <Tag className={cls} {...tagProps} {...rest}>
      {loading && <span className="tf-btn__spinner" aria-hidden="true" />}
      {iconLeft && <span className="tf-btn__icon">{iconLeft}</span>}
      {children != null && <span className="tf-btn__label">{children}</span>}
      {iconRight && <span className="tf-btn__icon">{iconRight}</span>}
    </Tag>
  );
}
