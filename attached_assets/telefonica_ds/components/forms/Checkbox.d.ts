import * as React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

/** Square checkbox — white tick on brand blue when checked. */
export function Checkbox(props: CheckboxProps): JSX.Element;
