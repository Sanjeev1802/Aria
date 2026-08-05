type ContentCardMeta = {
  label: string;
  value: string;
};

type ContentCardProps = {
  title: string;
  description: string;
  secondaryLink?: {
    label: string;
    href: string;
  };
  meta?: ContentCardMeta[];
  cta: {
    label: string;
    href: string;
  };
  children?: React.ReactNode;
  id?: string;
};

export default function ContentCard({
  title,
  description,
  secondaryLink,
  meta,
  cta,
  children,
  id,
}: ContentCardProps) {
  return (
    <article
      id={id}
      className="flex min-w-0 flex-col rounded-[1.25rem] bg-card p-6 sm:rounded-[1.5rem] sm:p-8"
    >
      <div className="flex flex-1 flex-col">
        <h3 className="min-w-0 break-words text-xl font-medium leading-snug tracking-tight text-foreground sm:text-2xl lg:text-[1.65rem]">
          {title}
        </h3>

        <p className="mt-4 font-serif text-sm leading-relaxed text-foreground/80 sm:text-base">
          {description}
        </p>

        {secondaryLink && (
          <a
            href={secondaryLink.href}
            className="mt-4 inline-flex w-fit text-sm text-foreground/70 transition-colors hover:text-foreground"
          >
            {secondaryLink.label} →
          </a>
        )}

        {children}
      </div>

      {meta && meta.length > 0 && (
        <>
          <hr className="my-6 border-foreground/15 sm:my-8" />
          <dl className="space-y-3">
            {meta.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 text-xs uppercase tracking-[0.15em]"
              >
                <dt className="min-w-0 shrink text-foreground/45">{row.label}</dt>
                <dd className="min-w-0 break-words text-right font-serif text-sm normal-case tracking-normal text-foreground/80">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <a
        href={cta.href}
        className="mt-6 inline-flex w-fit items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:mt-8"
      >
        {cta.label} →
      </a>
    </article>
  );
}
