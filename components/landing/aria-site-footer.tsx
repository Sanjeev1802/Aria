"use client";

import { ArrowUp, Github, Linkedin } from "lucide-react";
import { AriaMark } from "@/components/aria-mark";

type Props = {
  onBriefing?: () => void;
};

export function AriaSiteFooter({ onBriefing }: Props) {
  function scrollToTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
  }

  return (
    <footer className="aria-footer">
      <div className="aria-footer-inner">
        <div className="aria-footer-main">
          <div className="aria-footer-brand">
            <a className="aria-footer-logo" href="/" aria-label="ARIA home">
              <AriaMark />
              <span>ARIA</span>
            </a>
            <p className="aria-footer-tagline">Think once. Know more.</p>
            <p className="aria-footer-blurb">
              Intelligence for teams who need trusted models, approved context, and one continuous thread
              from question to decision.
            </p>
          </div>

          <nav className="aria-footer-nav" aria-label="Footer">
            <div className="aria-footer-col">
              <p className="aria-footer-col-title">Company</p>
              <a href="https://www.thebinaryholdings.com/" target="_blank" rel="noopener noreferrer">
                The Binary Holdings
              </a>
              <a href="https://www.thebinaryholdings.com/about" target="_blank" rel="noopener noreferrer">
                About
              </a>
              <a href="https://www.thebinaryholdings.com/team" target="_blank" rel="noopener noreferrer">
                Team
              </a>
              {onBriefing ? (
                <button type="button" onClick={onBriefing}>
                  Arrange a briefing
                </button>
              ) : null}
            </div>
            <div className="aria-footer-col">
              <p className="aria-footer-col-title">Product</p>
              <a href="/chat/">Workspace</a>
              <a href="/#features">Features</a>
              <a href="/#pricing">Pricing</a>
              <a href="/#faq">FAQ</a>
            </div>
            <div className="aria-footer-col">
              <p className="aria-footer-col-title">Legal</p>
              <a href="/terms/">Terms of Service</a>
              <a href="/privacy/">Privacy Policy</a>
            </div>
          </nav>
        </div>

        <div className="aria-footer-bottom">
          <p className="aria-footer-copy">© 2026 ARIA · Product preview</p>
          <div className="aria-footer-social" aria-label="Social links">
            <a href="https://x.com/" target="_blank" rel="noopener noreferrer" aria-label="ARIA on X">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://github.com/" target="_blank" rel="noopener noreferrer" aria-label="ARIA on GitHub">
              <Github strokeWidth={1.75} />
            </a>
            <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="ARIA on LinkedIn">
              <Linkedin strokeWidth={1.75} />
            </a>
          </div>
          <button type="button" className="aria-footer-top" aria-label="Back to top" onClick={scrollToTop}>
            <ArrowUp size={16} strokeWidth={1.75} />
            <span>Top</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
