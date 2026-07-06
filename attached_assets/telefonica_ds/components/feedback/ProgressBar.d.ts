import * as React from 'react';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. */
  value?: number;
  label?: React.ReactNode;
  /** Show the percentage on the right of the label row. */
  showValue?: boolean;
}

/** Determinate progress bar. */
export function ProgressBar(props: ProgressBarProps): JSX.Element;
