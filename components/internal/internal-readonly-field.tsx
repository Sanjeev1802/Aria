import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";

export function InternalReadonlyField({
  label,
  value,
  mono,
  wrap,
  verified,
  trailing,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
  verified?: boolean;
  trailing?: ReactNode;
}) {
  const fieldId = `readonly-field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const valueClass = [
    "internal-profile-field__value",
    mono ? "internal-profile-field__value--mono" : "",
    wrap ? "internal-profile-field__value--wrap" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="internal-profile-field">
      <span className="internal-profile-field__label" id={fieldId}>
        {label}
      </span>
      <div className="internal-profile-field__control" role="group" aria-labelledby={fieldId}>
        <span className={valueClass}>{value}</span>
        {verified || trailing ? (
          <div className="internal-profile-field__aside">
            {verified ? (
              <span className="internal-profile-field__verified">
                <BadgeCheck className="size-4" aria-hidden />
                Verified
              </span>
            ) : null}
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}
