'use client';

import { useState, type ReactNode, Children, isValidElement } from 'react';

interface CardProps {
  children:   ReactNode;
  className?: string;
  style?:     React.CSSProperties;
}

interface ExpandCardProps {
  shownChildren?:   ReactNode;
  hiddenChildren:   ReactNode;
  className?: string;
  style?:     React.CSSProperties;
  title?:     string;
  open?: boolean;
  /** Buttons beside the title (e.g. AddButton, RowMenu); ExpandCard only. */
  actions?:   ReactNode;
}

export function Card({ children, className, style }: Readonly<CardProps>) {
  return <div className={['card', className].filter(Boolean).join(' ')} style={style}>{children}</div>;
}

export function CardGridColumn({ children, className }: Readonly<CardProps>) {
  return <div className={className}>{children}</div>;
}

export function CardGridRow({ children, className }: Readonly<CardProps>) {
  return <div className={['card__grid--row', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function CardGrid({ children, columns = 2, rows = false, className }:
    Readonly<CardProps & { columns?: number; rows?: boolean; }>) {
  if (columns === 0 || !columns) { columns = 1; }
  const childArray = Children.toArray(children);

  if (childArray.every(c => isValidElement(c) && c.type === CardGridColumn)) {
    return (
      <div className={['card__grid', className].filter(Boolean).join(' ')}
        style={{ '--columns': columns } as React.CSSProperties}>
        {children}
      </div>
    );
  }

  const chunkSize = rows ? columns : Math.ceil(childArray.length / columns);
  const chunks    = Array.from({ length: Math.ceil(childArray.length / chunkSize) }, (_, i) =>
    childArray.slice(i * chunkSize, (i + 1) * chunkSize)
  );

  return (
    <div className={['card__grid', className].filter(Boolean).join(' ')}
      style={{ '--columns': columns } as React.CSSProperties}>
      {chunks.map((chunk, i) => (
        <CardGridColumn key={i}>
          {chunk}
        </CardGridColumn>
      ))}
    </div>
  );
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

export function SubCardBody({ children, className, style }: Readonly<CardProps>) {
  return <div className={['card__sub-body', className].filter(Boolean).join(' ')} style={style}>{children}</div>;
}

/** The clickable header of an expandable panel/card: its content plus a ▶/▼
 *  chevron, as one button (keyboard-reachable, announces open/closed). */
function ExpandToggle({
  expanded, onToggle, className, children,
}: Readonly<{ expanded: boolean; onToggle: () => void; className: string; children?: ReactNode }>) {
  return (
    <button type="button" className={className} aria-expanded={expanded} onClick={onToggle}>
      {children}
      <span aria-hidden="true"
        className={expanded ? 'card__expand--chevron-expanded' : 'card__expand--chevron-expand'} />
    </button>
  );
}

export function ExpandPanel({ shownChildren, hiddenChildren, className, style, title, open = false }: Readonly<ExpandCardProps>) {
  const [expanded, setExpanded] = useState(open);
  return <div className={['card__expand-panel', className].filter(Boolean).join(' ')} style={style}>
            <ExpandToggle expanded={expanded} onToggle={() => setExpanded(e => !e)} className='card__expand-panel--header'>
              {title && <span className='card__expand-panel--title'>{title}</span>}
            </ExpandToggle>
            <div className='card__expand-panel--body'>
              {shownChildren}
              {expanded && (hiddenChildren)}
            </div>
          </div>;
}

export function ExpandPreview({ previewChildren, hiddenChildren, className, style, title, open = false }:
  Readonly<{
    previewChildren:   ReactNode;
    hiddenChildren:   ReactNode;
    className?: string;
    style?:     React.CSSProperties;
    title?:     string;
    open?: boolean}
  >) {
  const [expanded, setExpanded] = useState(open);
  return <div className={['card__expand-panel', className].filter(Boolean).join(' ')} style={style}>
            <ExpandToggle expanded={expanded} onToggle={() => setExpanded(e => !e)} className='card__expand-panel--header'>
              {title && <span className='card__expand-panel--title'>{title}</span>}
            </ExpandToggle>
            <div className='card__expand-panel--body'>
              {!expanded && (previewChildren)}
              {expanded && (hiddenChildren)}
            </div>
          </div>;
}

export function ExpandCard({ shownChildren, hiddenChildren, className, style, title, open = false, actions }: ExpandCardProps) {
  const [expanded, setExpanded] = useState(open);
  return <Card className={['card__expand', className].filter(Boolean).join(' ')} style={style}>
          {title && (
            <CardHeader className='card__expand--header'>
              <ExpandToggle expanded={expanded} onToggle={() => setExpanded(e => !e)} className='card__expand-toggle'>
                <CardTitle>{title}</CardTitle>
              </ExpandToggle>
              {actions && <CardActions>{actions}</CardActions>}
            </CardHeader>
          )}
          {/* No empty body (and its padding) under a collapsed header. */}
          {(shownChildren || expanded) && (
            <CardBody>
              {shownChildren}
              {expanded && (hiddenChildren)}
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
        </>
}

export function CardSectionLabel({
  children, spaced = false,
}: Readonly<{ children: ReactNode; /** Extra space above (a second label in one section). */ spaced?: boolean }>) {
  return <p className={spaced ? 'card__section-label card__section-label--spaced' : 'card__section-label'}>{children}</p>;
}

/** Faint secondary text after a section label (e.g. "· Medications", "2/5"). */
export function CardSectionMeta({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="card__section-meta">{children}</span>;
}

/**
 * A section's heading row: its label with actions at the right, the same way
 * CardHeader holds CardTitle and CardActions.
 *
 *   <CardSectionHeader>
 *     <CardSectionLabel>Gratitude</CardSectionLabel>
 *     <CardActions><Button …>+ Another</Button></CardActions>
 *   </CardSectionHeader>
 */
export function CardSectionHeader({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="card__section-header">{children}</div>;
}

export function CardActions({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <div className={`card__actions`}>
        <div className='card__actions--body'>
          {children}
        </div>
      </div>
    </>
  );
}

export function CardDescription({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="card__description">{children}</div>;
}

/**
 * SectionCard — a titled card: the frame for a settings section or any
 * other block with a heading.
 *
 *   <SectionCard title="Tags" meta="3 active" description="Used on…">
 *     …
 *   </SectionCard>
 *
 * `bare` drops the frame and the title, for a module placed inside a
 * LayoutCard (whose own title stands in): meta and actions become a section
 * header row, and the content follows.
 */
export function SectionCard({
  title,
  meta,
  actions,
  description,
  bare = false,
  className,
  children,
}: Readonly<{
  title:        ReactNode;
  /** Small text at the right of the header (e.g. "3 active"). */
  meta?:        ReactNode;
  /** Buttons at the right of the header (shown after meta). */
  actions?:     ReactNode;
  /** Muted text under the title. */
  description?: ReactNode;
  /** No card and no title: just the header actions and content (see above). */
  bare?:        boolean;
  /** On the card; not used when bare. */
  className?:   string;
  children:     ReactNode;
}>) {
  if (bare) {
    return (
      <>
        {(meta || actions) && (
          <CardSectionHeader>
            <CardActions>
              {meta && <span className="card__meta">{meta}</span>}
              {actions}
            </CardActions>
          </CardSectionHeader>
        )}
        {description && <CardDescription>{description}</CardDescription>}
        {children}
      </>
    );
  }
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {(meta || actions) && (
          <CardActions>
            {meta && <span className="card__meta">{meta}</span>}
            {actions}
          </CardActions>
        )}
      </CardHeader>
      <CardBody>
        {description && <CardDescription>{description}</CardDescription>}
        {children}
      </CardBody>
    </Card>
  );
}
