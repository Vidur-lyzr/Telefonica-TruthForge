import * as React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  /** Optional count pill on the right of the label. */
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabItem[];
  /** Controlled active id. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
}

/** Underline tab bar. */
export function Tabs(props: TabsProps): JSX.Element;
