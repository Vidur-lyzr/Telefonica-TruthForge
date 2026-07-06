import * as React from 'react';

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: React.ReactNode;
  /** Leading icon; a variant-coloured dot is used when omitted. */
  icon?: React.ReactNode;
  /** Action row (e.g. buttons) under the text. */
  action?: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
}

/** Inline informational banner with tinted background. */
export function Callout(props: CalloutProps): JSX.Element;
