import ReactMarkdown from 'react-markdown';
import remarkGfm     from 'remark-gfm';

interface Props {
  children: string;
  className?: string;
}

/**
 * Renders a markdown string as styled HTML.
 * Uses .prose CSS class for all typography — change one place to update everywhere.
 * Safe: react-markdown never uses dangerouslySetInnerHTML.
 */
export function Markdown({ children, className }: Readonly<Props>) {
  return (
    <div className={['prose', className].filter(Boolean).join(' ')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
