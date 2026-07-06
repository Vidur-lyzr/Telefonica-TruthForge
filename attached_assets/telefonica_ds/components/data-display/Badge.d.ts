import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Number to display (ignored when `dot`). */
  count?: number;
  /** Render a small dot instead of a number. */
  dot?: boolean;
  /** Cap large numbers, e.g. 99+. */
  max?: number;
}

/** Numeric counter or dot indicator, usually overlaid on an icon. */
export function Badge(props: BadgeProps): JSX.Element;
