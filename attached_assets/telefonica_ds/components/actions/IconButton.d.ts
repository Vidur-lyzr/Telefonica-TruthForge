import * as React from 'react';

export type IconButtonVariant = 'ghost' | 'solid' | 'outline';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — required, since the button has no visible text. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** The icon glyph (svg / img). */
  children: React.ReactNode;
}

/** Circular icon-only button. */
export function IconButton(props: IconButtonProps): JSX.Element;
