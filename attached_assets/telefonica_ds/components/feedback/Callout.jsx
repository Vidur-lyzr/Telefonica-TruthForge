import React from 'react';

/**
 * Telefónica Callout — inline informational banner. Pass an `icon` node, or a
 * variant-coloured dot is shown by default. Optional `action` and `onClose`.
 */
export function Callout({
  variant = 'info',  // info | success | warning | error
  title,
  children,
  icon,
  action,
  onClose,
  className = '',
  ...rest
}) {
  const cls = ['tf-callout', `tf-callout--${variant}`, className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="status" {...rest}>
      <span className="tf-callout__icon">{icon || <span className="tf-callout__mark" />}</span>
      <div className="tf-callout__body">
        {title && <p className="tf-callout__title">{title}</p>}
        {children && <div className="tf-callout__desc">{children}</div>}
        {action && <div className="tf-callout__action">{action}</div>}
      </div>
      {onClose && (
        <button type="button" className="tf-callout__close" aria-label="Dismiss" onClick={onClose}>✕</button>
      )}
    </div>
  );
}
