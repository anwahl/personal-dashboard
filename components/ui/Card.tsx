import type { ReactNode } from 'react';

interface CardProps {
  children:   ReactNode;
  className?: string;
  style?:     React.CSSProperties;
}

export function Card({ children, className, style }: Readonly<CardProps>) {
  return <div className={['card', className].filter(Boolean).join(' ')} style={style}>{children}</div>;
}

export function SubCard({ children, className, style }: Readonly<CardProps>) {
  return <div className={['card__sub', className].filter(Boolean).join(' ')} style={style}>{children}</div>;
}

export function CardHeader({ children, className, style }: Readonly<CardProps>) {
  return <div className={['card__header', className].filter(Boolean).join(' ')} style={style}>{children}</div>;
}

export function CardTitle({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="card__title">{children}</span>;
}

export function CardBody({ children, flush, className, style }: CardProps & { flush?: boolean }) {
  const classes = ['card__body', flush && 'card__body--flush', className]
    .filter(Boolean)
    .join(' ');
  return <div className={classes} style={style}>{children}</div>;
}

export function CardFooter({ children, className, style }: Readonly<CardProps>) {
  return <div className={['card__footer', className].filter(Boolean).join(' ')} style={style}>{children}</div>;
}

export function CardSection({ children, className, style }: Readonly<CardProps>) {
  return <>
          <div  className={['card__section', className].filter(Boolean).join(' ')}
                style={style}>
                  {children}
          </div>
          <hr />
        </>
}

export function CardSectionLabel({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="card__section-label">{children}</p>;
}
