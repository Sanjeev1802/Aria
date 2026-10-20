"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
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
      <span className="flex items-center gap-1 text-muted-foreground">
        {value ? <span className="text-sm">{value}</span> : null}
        <ChevronRight className="size-4 opacity-70" aria-hidden />
      </span>
    </>
  );
  const className = cn(
    "h-auto min-h-11 w-full justify-between rounded-none px-4 py-3 font-normal",
    "hover:bg-muted/60",
  );
  if (href) {
    return (
      <Button asChild variant="ghost" className={className}>
        <Link href={href}>{body}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" variant="ghost" className={className}>
      {body}
    </Button>
  );
}

export function SettingsDangerRow({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto min-h-11 w-full justify-start rounded-none px-4 py-3 font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      {label}
    </Button>
  );
}
