import * as React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Telefónica pill button. Solid blue for the single primary action per view.
 * @startingPoint section="Actions" subtitle="Pill buttons — primary, secondary, danger, link" viewport="700x380"
 */
export interface ButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** Visual style. `primary` is solid blue; `inverse` sits on blue/navy. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the full width of the container. */
  block?: boolean;
  /** Show a spinner and block interaction. */
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  /** Render as a link when set. */
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
