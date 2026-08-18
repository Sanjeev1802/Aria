import { footerColumns, footerTagline } from "@/lib/data/footer";

type FooterProps = {
  roundedTop?: boolean;
};

export default function Footer({ roundedTop = false }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`bg-dark text-background ${
        roundedTop
          ? "rounded-t-2xl sm:rounded-t-[2rem] md:rounded-t-[2.5rem] lg:rounded-t-[3rem]"
          : ""
      }`}
    >
      <div className="page-container py-14 pb-16 sm:py-16 sm:pb-20 md:py-20 lg:py-24 safe-bottom">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-16 xl:gap-24">
          <div className="min-w-0">
            <a
              href="/"
              className="text-lg font-semibold tracking-tight text-background sm:text-xl"
            >
              BNII ARIA
            </a>
            <p className="mt-4 max-w-sm font-serif text-sm leading-relaxed text-background/60 sm:text-base">
              {footerTagline}
            </p>
            <a
              href="/contact"
              className="mt-6 inline-flex items-center rounded-full bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
            >
              Try ARIA
            </a>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4 md:gap-6 lg:gap-8"
          >
            {footerColumns.map((column) => (
              <div key={column.title} className="min-w-0">
                <p className="mb-4 text-xs uppercase tracking-[0.2em] text-background/50">
                  {column.title}
                </p>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="break-words text-sm text-background/70 transition-colors hover:text-background"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-background/15 pt-8 sm:mt-14 sm:flex-row sm:items-center md:mt-16">
          <p className="text-sm text-background/50">
            © {year} Bnii ARIA. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-6">
            <a
              href="/privacy"
              className="text-sm text-background/50 transition-colors hover:text-background/80"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-sm text-background/50 transition-colors hover:text-background/80"
            >
              Terms
            </a>
            <a
              href="/contact"
              className="text-sm text-background/50 transition-colors hover:text-background/80"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
