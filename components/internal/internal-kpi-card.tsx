import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { CountUp } from "./count-up";

type Tone = "blue" | "violet" | "teal" | "orange";

/** One headline figure. Numbers count up on first load and glide when live data refreshes. */
export function InternalKpiCard({
  label,
  value,
  format,
  footerTitle,
  footerDetail,
  icon: Icon,
  tone,
  index = 0,
}: {
  label: string;
  value: string | number;
  format?: (n: number) => string;
  footerTitle: string;
  footerDetail?: string;
  icon: LucideIcon;
  tone: Tone;
  /** Position in its row; offsets the entrance animation. */
  index?: number;
}) {
  return (
    <article className={`internal-kpi internal-kpi--${tone}`} style={{ "--i": index } as CSSProperties}>
      <header className="internal-kpi__top">
        <span className="internal-kpi__label">{label}</span>
        <span className="internal-kpi__icon" aria-hidden="true">
          <Icon size={16} strokeWidth={1.9} />
        </span>
      </header>
      <p className="internal-kpi__value">
        {typeof value === "number" ? <CountUp value={value} format={format} /> : value}
      </p>
      <footer className="internal-kpi__foot">
        <span className="internal-kpi__chip">{footerTitle}</span>
        {footerDetail ? <span className="internal-kpi__hint">{footerDetail}</span> : null}
      </footer>
    </article>
  );
}
