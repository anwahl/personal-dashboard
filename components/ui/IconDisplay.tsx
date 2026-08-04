/**
 * components/ui/IconDisplay.tsx
 *
 * Renders an SVG icon from an IconRow, or falls back to a plain emoji
 * string (for rows that still have the old emoji column set).
 *
 * Sizes:
 *   sm — 20×20px   (inline next to text)
 *   md — 28×28px   (picker grid, buttons)
 *   lg — 40×40px   (settings list preview)
 */

import type { IconRow } from '@/types/schema';

/** Strip XML declaration and DOCTYPE so the string is safe for innerHTML. */
function cleanSvg(raw: string): string {
  return raw
    .replace(/<\?xml[^?]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .trim();
}

interface Props {
  icon?:          IconRow | null;
  size?:          'sm' | 'md' | 'lg';
  className?:     string;
}

export function IconDisplay({
  icon,
  size      = 'md',
  className = '',
}: Readonly<Props>) {
  const cls = `icon-display icon-display--${size}${className ? ` ${className}` : ''}`;

  if (icon?.svg_data) {
    return (
      <span
        className={cls}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: cleanSvg(icon.svg_data) }}
        aria-hidden="true"
      />
    );
  }

  return (
    <span className={cls}>
      {'•'}
    </span>
  );
}
