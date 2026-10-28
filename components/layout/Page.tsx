import Link from "next/link";
import { ReactNode } from "react";
import { PrevNextNav, type PrevNextStep } from "@/components/ui";

export function Header({ title, subtitle, href, linkLabel, prev, next, navLabel }:
    Readonly<{
        title:          string;
        /** Muted line under the title. */
        subtitle?:      string;
        href?:           string;
        linkLabel?:      string;
        /** With prev and next, the title sits between ‹ › arrows (e.g. a day). */
        prev?:          PrevNextStep;
        next?:          PrevNextStep;
        navLabel?:      string;
    }>) {
  const heading = <h1 className="page-header__title">{title}</h1>;
  return (
    <div className="page-header">
        {(href && linkLabel) && (
            <Link href={href} className='page-back-link'>{linkLabel}</Link>
        )}
        {prev && next
          ? <PrevNextNav label={heading} prev={prev} next={next} navLabel={navLabel} />
          : heading}
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
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
