"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocSection } from "@/lib/data/resources";

type DocsSidebarProps = {
  sections: DocSection[];
  activeSlug: string;
};

export default function DocsSidebar({
  sections,
  activeSlug,
}: DocsSidebarProps) {
  const selectId = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const flatItems = sections.flatMap((section) => section.items);
  const activeTitle =
    flatItems.find((item) => item.slug === activeSlug)?.title ?? "Docs";

  return (
    <nav aria-label="Documentation" className="min-w-0 lg:sticky lg:top-28 lg:self-start">
      {/* Mobile / tablet: compact select + collapsible */}
      <div className="lg:hidden">
        <label htmlFor={selectId} className="sr-only">
          Choose a docs page
        </label>
        <select
          id={selectId}
          className="w-full appearance-none rounded-xl border border-foreground/15 bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground/30"
          value={activeSlug}
          onChange={(event) => {
            router.push(`/docs?page=${event.target.value}`);
          }}
        >
          {sections.map((section) => (
            <optgroup key={section.slug} label={section.title}>
              {section.items.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between rounded-lg px-1 py-2 text-left text-sm text-foreground/70"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span>
            Browsing: <span className="font-medium text-foreground">{activeTitle}</span>
          </span>
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>

        {open && (
          <ul className="mt-2 space-y-6 border-t border-foreground/10 pt-4">
            {sections.map((section) => (
              <li key={section.slug}>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/50">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.slug}>
                      <a
                        href={`/docs?page=${item.slug}`}
                        className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                          item.slug === activeSlug
                            ? "bg-foreground/5 font-medium text-foreground"
                            : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                        }`}
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop sidebar */}
      <ul className="hidden space-y-8 lg:block">
        {sections.map((section) => (
          <li key={section.slug}>
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-foreground/50">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.slug}>
                  <a
                    href={`/docs?page=${item.slug}`}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      item.slug === activeSlug
                        ? "bg-foreground/5 font-medium text-foreground"
                        : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                    }`}
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
