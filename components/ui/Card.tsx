import { useState, type ReactNode } from 'react';

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

export function SubCardBody({ children, className, style }: CardProps & { flush?: boolean }) {
  return <div className={['card__sub-body', className].filter(Boolean).join(' ')} style={style}>{children}</div>;
}

export function ExpandPanel({ children, className, style, title }: CardProps & { title?: string }) {
  const [expanded, setExpanded] = useState(false);
  return <div className={['card__expand-panel', className].filter(Boolean).join(' ')} style={style}>
            <span className='card__expand-panel--header'>
              {title && (
                <span className={'card__expand-panel--title'}>
                  {title}
                </span>)}
                <span 
                  className={`${expanded ? 'card__expand--chevron-expanded'
                                : 'card__expand--chevron-expand'}`} 
                  onClick={() => setExpanded(e => !e)}
                />
            </span>
            {expanded && (
              <div className='card__expand-panel--body'>
                {children}
              </div>
            )}
          </div>;
}

export function ExpandCard({ children, className, style, title }: CardProps & { title?: string }) {
  const [expanded, setExpanded] = useState(false);
  return <Card className={['card__expand', className].filter(Boolean).join(' ')} style={style}>
          {title && (
            <CardHeader className='card__expand--header'>
              <CardTitle>{title}</CardTitle>
              <span 
                  className={`${expanded ? 'card__expand--chevron-expanded'
                                : 'card__expand--chevron-expand'}`} 
                  onClick={() => setExpanded(e => !e)}
                />
            </CardHeader>
          )}
          {expanded && (
            <CardBody>
              {children}
            </CardBody>
          )}
        </Card>
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
