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
import { cleanSvg } from "@/lib/utils/svg";

interface Props {
  svg_data:         string;
  size?:            'sm' | 'md' | 'lg';
  className?:       string;
}

export function Icon({
  svg_data  = '',
  size      = 'md',
  className = '',
}: Readonly<Props>) {
    const cls = `icon-display icon-display--${size}${className ? ` ${className}` : ''}`;

    return (
        <span
        className={cls}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: cleanSvg(svg_data) }}
        aria-hidden="true"
        />
    );
}
