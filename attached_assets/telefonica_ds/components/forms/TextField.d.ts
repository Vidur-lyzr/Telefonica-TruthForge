import * as React from 'react';

/**
 * Outlined text input with label, helper text and error state.
 * @startingPoint section="Forms" subtitle="Outlined field — label, helper, error, adornments" viewport="700x400"
 */
export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  helperText?: React.ReactNode;
  error?: boolean;
  /** Leading adornment (icon or text). */
  prefix?: React.ReactNode;
  /** Trailing adornment (icon or text). */
  suffix?: React.ReactNode;
}

export function TextField(props: TextFieldProps): JSX.Element;
