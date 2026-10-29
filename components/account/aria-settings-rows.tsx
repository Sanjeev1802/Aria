"use client";

import { cn } from "@/lib/utils";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SettingsToggleRow({
  label,
  description,
  pressed,
  onPressedChange,
}: {
  label: string;
  description?: string;
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
}) {
  return (
    <Field orientation="horizontal" className="items-center justify-between gap-4 px-4 py-3">
      <FieldContent>
        <FieldLabel className="font-medium">{label}</FieldLabel>
        {description ? <FieldDescription>{description}</FieldDescription> : null}
      </FieldContent>
      <Switch checked={pressed} onCheckedChange={onPressedChange} aria-label={label} />
    </Field>
  );
}

export function SettingsLinkRow({ label, value, href }: { label: string; value?: string; href?: string }) {
  const body = (
    <>
      <span>{label}</span>
      <span className="aria-settings-row__value">
        {value ? <span>{value}</span> : null}
        {href ? <ChevronRight size={16} strokeWidth={1.75} aria-hidden /> : null}
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="aria-settings-row">
        {body}
      </Link>
    );
  }
  return <div className="aria-settings-row">{body}</div>;
}

export function SettingsDangerRow({ label }: { label: string }) {
  return (
    <button type="button" className={cn("aria-settings-row", "text-[#f0a8a8]")}>
      {label}
    </button>
  );
}
