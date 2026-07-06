import React from 'react';

/**
 * Telefónica ProgressBar — determinate progress (0–100). Optional label row.
 */
export function ProgressBar({
  value = 0,
  label,
  showValue = false,
  className = '',
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={['tf-progress-field', className].filter(Boolean).join(' ')} {...rest}>
      {(label || showValue) && (
        <div className="tf-progress__head">
          {label ? <span>{label}</span> : <span />}
          {showValue && <span>{pct}%</span>}
        </div>
      )}
      <div className="tf-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="tf-progress__fill" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}
