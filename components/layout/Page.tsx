import Link from "next/link";
import { ReactNode } from "react";

export function Header({ title, href, linkLabel }:
    Readonly<{
        title:          string;
        href?:           string;
        linkLabel?:      string;
    }>) {
  return (
    <div className="page-header">
        {(href && linkLabel) && (
            <Link href={href} className='page-back-link'>{linkLabel}</Link>
        )}
        <h1 className="page-header__title">{title}</h1>
    </div>
  );
}

export function PageBody({ children }: Readonly<{ children: ReactNode; }>) {
  return (
    <div className="page-content">
      {children}
    </div>
  );
}