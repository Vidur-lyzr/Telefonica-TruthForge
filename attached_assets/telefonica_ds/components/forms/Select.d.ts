import * as React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: React.ReactNode;
  error?: boolean;
  /** Disabled first option shown when nothing is selected. */
  placeholder?: string;
  children?: React.ReactNode;
}

/** Native select with the brand's outlined styling and chevron. */
export function Select(props: SelectProps): JSX.Element;
