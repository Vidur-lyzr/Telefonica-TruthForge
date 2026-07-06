import * as React from 'react';

export type TagVariant = 'promo' | 'success' | 'warning' | 'error' | 'info' | 'inactive';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  /** Show a leading status dot. */
  dot?: boolean;
  children?: React.ReactNode;
}

/** Small status pill. */
export function Tag(props: TagProps): JSX.Element;
