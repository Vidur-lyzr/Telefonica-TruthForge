import * as React from 'react';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

/** Round radio control. Group several with a shared `name`. */
export function Radio(props: RadioProps): JSX.Element;
