import React from 'react';

/**
 * Telefónica Avatar — circular image or initials fallback.
 */
export function Avatar({
  src,
  alt = '',
  initials,
  size = 'md',  // sm | md | lg | xl
  className = '',
  ...rest
}) {
  const cls = ['tf-avatar', `tf-avatar--${size}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      {src ? <img src={src} alt={alt} /> : (initials || '').slice(0, 2).toUpperCase()}
    </span>
  );
}
