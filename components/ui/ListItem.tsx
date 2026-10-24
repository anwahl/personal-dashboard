/**
 * ListItem — one row in a list of records (tasks, appointments, …):
 *
 *   [leading]  Title                         [trailing]
 *              meta · meta · meta
 *
 *   <ListItem
 *     leading={<TaskCheck … />}
 *     title={task.title}
 *     meta={<><span>{due}</span><span>{person}</span></>}
 *     trailing={<Chip …>in 3 days</Chip>}
 *     href={`/tasks/${task.id}`}
 *     muted={done}
 *   />
 *
 * With `href`, the title and meta link to the record (leading/trailing stay
 * separately clickable). `meta` items are spaced by the row, so pass them as
 * separate elements.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

export function ListItem({
  title, meta, leading, trailing, href, muted, strike, className,
}: Readonly<{
  title:      ReactNode;
  meta?:      ReactNode;
  leading?:   ReactNode;
  trailing?:  ReactNode;
  /** Links the title and meta to this page. */
  href?:      string;
  /** Dimmed (done, past). */
  muted?:     boolean;
  /** Strike through the title (done). */
  strike?:    boolean;
  className?: string;
}>) {
  const cls = ['list-item', muted && 'list-item--muted', className].filter(Boolean).join(' ');
  const body = (
    <>
      <div className={`list-item__title${strike ? ' list-item__title--strike' : ''}`}>{title}</div>
      {meta && <div className="list-item__meta">{meta}</div>}
    </>
  );
  return (
    <div className={cls}>
      {leading}
      {href
        ? <Link href={href} className="list-item__body list-item__body--link">{body}</Link>
        : <div className="list-item__body">{body}</div>}
      {trailing && <div className="list-item__actions">{trailing}</div>}
    </div>
  );
}
