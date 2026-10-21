import Link from "next/link";
import type { ReactNode } from "react";
import { AriaMark } from "@/components/aria-mark";

export type LegalTocItem = { id: string; title: string };

export function AriaLegalShell({
  document,
  title,
  lead,
  updated,
  toc,
  children,
}: {
  document: "terms" | "privacy";
  title: string;
  lead: string;
  updated: string;
  toc: LegalTocItem[];
  children: ReactNode;
}) {
  return (
    <div className="aria-legal-page">
      <a className="skip-link" href="#legal-main">Skip to content</a>
      <header className="aria-legal-header">
        <Link className="brand" href="/" aria-label="ARIA home">
          <AriaMark />
          <span>ARIA</span>
        </Link>
        <nav className="aria-legal-nav" aria-label="Legal documents">
          <Link href="/terms/" aria-current={document === "terms" ? "page" : undefined}>
            Terms
          </Link>
          <Link href="/privacy/" aria-current={document === "privacy" ? "page" : undefined}>
            Privacy
          </Link>
          <Link href="/sign-in/">Sign in</Link>
        </nav>
      </header>

      <header className="aria-legal-hero">
        <p className="aria-legal-kicker">{document === "terms" ? "Terms of Service" : "Privacy Policy"}</p>
        <h1>{title}</h1>
        <p className="aria-legal-lead">{lead}</p>
        <p className="aria-legal-meta">
          <span>Effective {updated}</span>
          <span>The Binary Holdings</span>
          <span>ARIA product</span>
        </p>
      </header>

      <div className="aria-legal-layout">
        <nav className="aria-legal-toc" aria-label="On this page">
          <p>On this page</p>
          {toc.map((item) => (
            <a key={item.id} href={`#${item.id}`}>{item.title}</a>
          ))}
        </nav>
        <article id="legal-main" className="aria-legal-article">
          {children}
        </article>
      </div>

      <footer className="aria-legal-end">
        <p>© 2026 The Binary Holdings · ARIA</p>
        <nav aria-label="Legal">
          <Link href="/terms/">Terms of Service</Link>
          <Link href="/privacy/">Privacy Policy</Link>
        </nav>
      </footer>
    </div>
  );
}
