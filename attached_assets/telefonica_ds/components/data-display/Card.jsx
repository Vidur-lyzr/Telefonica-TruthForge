import React from 'react';

/**
 * Telefónica Card — flexible content card with optional media, eyebrow,
 * title, description and footer. Becomes interactive when `href`/`onClick` set.
 */
export function Card({
  media,
  mediaAlt = '',
  eyebrow,
  title,
  description,
  footer,
  elevated = false,
  href,
  onClick,
  children,
  className = '',
  ...rest
}) {
  const interactive = Boolean(href || onClick);
  const cls = [
    'tf-card',
    elevated ? 'tf-card--elevated' : '',
    interactive ? 'tf-card--interactive' : '',
    className,
  ].filter(Boolean).join(' ');
  const Tag = href ? 'a' : 'div';
  return (
    <Tag className={cls} href={href} onClick={onClick} {...rest}>
      {media && (
        <div className="tf-card__media"><img src={media} alt={mediaAlt} /></div>
      )}
      <div className="tf-card__body">
        {eyebrow && <div className="tf-card__eyebrow">{eyebrow}</div>}
        {title && <h3 className="tf-card__title">{title}</h3>}
        {description && <p className="tf-card__desc">{description}</p>}
        {children}
      </div>
      {footer && <div className="tf-card__footer">{footer}</div>}
    </Tag>
  );
}
