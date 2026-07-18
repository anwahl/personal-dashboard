import type { ReactNode } from 'react';

interface CardProps {
  children:   ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <div className={['card', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={['card__header', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <span className="card__title">{children}</span>;
}

export function CardBody({ children, flush, className }: CardProps & { flush?: boolean }) {
  const classes = ['card__body', flush && 'card__body--flush', className]
    .filter(Boolean)
    .join(' ');
  return <div className={classes}>{children}</div>;
}

export function CardFooter({ children, className }: CardProps) {
  return <div className={['card__footer', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function CardSection({ children, className }: CardProps) {
  return <div className={['card__section', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function CardSectionLabel({ children }: { children: ReactNode }) {
  return <p className="card__section-label">{children}</p>;
}
