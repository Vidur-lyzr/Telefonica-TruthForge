import * as React from 'react';

/**
 * Content card with optional media, eyebrow, title, description and footer.
 * @startingPoint section="Data display" subtitle="Content card — media, title, footer" viewport="700x420"
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Image URL rendered in a 16:10 media area at the top. */
  media?: string;
  mediaAlt?: string;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Footer content, typically buttons or a link. */
  footer?: React.ReactNode;
  /** Drop the border for a soft shadow instead. */
  elevated?: boolean;
  /** Render as a link and enable hover-lift. */
  href?: string;
  children?: React.ReactNode;
}

export function Card(props: CardProps): JSX.Element;
