import * as React from 'react';

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

/** On/off toggle. Track turns blue when on. */
export function Switch(props: SwitchProps): JSX.Element;
