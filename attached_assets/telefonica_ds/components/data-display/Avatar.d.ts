import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  alt?: string;
  /** Fallback shown when no `src` — first two letters are used. */
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/** Circular avatar — image, or initials on a blue tint. */
export function Avatar(props: AvatarProps): JSX.Element;
