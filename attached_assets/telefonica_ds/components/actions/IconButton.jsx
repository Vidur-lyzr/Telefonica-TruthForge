import React from 'react';

/**
 * Telefónica IconButton — a circular, icon-only control. Always pass `label`
 * for accessibility. Provide the glyph as children (e.g. an <svg> or <img>).
 */
export function IconButton({
  children,
  label,
  variant = 'ghost',  // ghost | solid | outline
  size = 'md',        // sm | md | lg
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = [
    'tf-iconbtn',
    `tf-iconbtn--${variant}`,
    `tf-iconbtn--${size}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type="button" className={cls} aria-label={label} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
