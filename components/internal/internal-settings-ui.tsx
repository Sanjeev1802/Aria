"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InternalSettingsPrototypeNotice({ children }: { children: ReactNode }) {
  return (
    <div className="internal-settings-prototype" role="status">
      <p>{children}</p>
    </div>
  );
}

export function InternalSettingsFormCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="internal-settings-form-card">
      <div className="internal-settings-form-card__header">
        <h3 className="internal-settings-form-card__title">{title}</h3>
        {description ? <p className="internal-settings-form-card__description">{description}</p> : null}
      </div>
      <div className="internal-settings-form-card__body">{children}</div>
    </section>
  );
}

export function InternalSettingsReadonlyInput({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="internal-settings-field">
      <Label className="internal-settings-field__label block">{label}</Label>
      <Input
        className="internal-settings-field__input internal-settings-field__input--readonly w-full"
        readOnly
        value={value}
      />
      {hint ? <p className="internal-settings-field__hint">{hint}</p> : null}
    </div>
  );
}

export function InternalSettingsSelectField<T extends string>({
  label,
  value,
  options,
  onValueChange,
  hint,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onValueChange: (value: T) => void;
  hint?: string;
}) {
  return (
    <div className="internal-settings-field">
      <Label className="internal-settings-field__label block">{label}</Label>
      <Select value={value} onValueChange={next => onValueChange(next as T)}>
        <SelectTrigger className="internal-settings-field__input w-full shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint ? <p className="internal-settings-field__hint">{hint}</p> : null}
    </div>
  );
}

export function InternalSettingsFormFooter({
  prototype,
  onCancel,
}: {
  prototype?: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="internal-settings-form-footer">
      <div className="internal-operator-profile__footer">
        <p className="internal-operator-profile__footer-hint">
          {prototype
            ? "Save is disabled until platform policy APIs exist. Values shown reflect product defaults or server configuration."
            : "Changes apply only where the server confirms them."}
        </p>
        <div className="internal-operator-profile__footer-actions">
          <Button type="button" variant="outline" className="shadow-none" disabled={!onCancel} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" className="shadow-none" disabled>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
