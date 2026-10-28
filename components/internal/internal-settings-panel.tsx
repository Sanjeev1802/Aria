import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function InternalSettingsGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("internal-settings-group flex h-full flex-col gap-2.5", className)}>
      <h3 className="internal-settings-group__title">{title}</h3>
      <div className="internal-settings-group__card flex flex-1 flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {children}
      </div>
    </section>
  );
}

export function InternalSettingsRow({
  label,
  hint,
  children,
  onClick,
  href,
  openInNewTab,
  className,
}: {
  label: string;
  hint?: string;
  children?: ReactNode;
  onClick?: () => void;
  href?: string;
  openInNewTab?: boolean;
  className?: string;
}) {
  const showChevron = Boolean(onClick || href);
  const inner = (
    <>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="internal-settings-row__label">{label}</p>
        {hint ? <p className="internal-settings-row__hint">{hint}</p> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
      {showChevron ? <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </>
  );

  const rowClassName = cn(
    "internal-settings-row internal-settings-row--button flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/60 sm:px-5",
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={rowClassName}
        {...(openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rowClassName}>
        {inner}
      </button>
    );
  }

  return (
    <div className={cn("internal-settings-row flex items-center gap-3 px-4 py-4 sm:px-5", className)}>
      {inner}
    </div>
  );
}
