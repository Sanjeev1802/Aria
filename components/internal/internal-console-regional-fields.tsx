"use client";

import { useMemo } from "react";
import {
  INTERNAL_CONSOLE_BILLING_PERIOD_OPTIONS,
  INTERNAL_CONSOLE_LANGUAGE_OPTIONS,
  INTERNAL_CONSOLE_TIMEZONE_OPTIONS,
  formatInternalConsoleDateTime,
  resolveInternalConsoleLanguage,
  resolveInternalConsoleTimeZone,
  type InternalConsoleBillingPeriod,
  type InternalConsoleLanguagePreset,
  type InternalConsoleTimezonePreset,
} from "@/lib/internal-console-regional";
import { InternalReadonlyField } from "./internal-readonly-field";
import { InternalSettingsReadonlyInput, InternalSettingsSelectField } from "./internal-settings-ui";
import { useInternalConsoleRegional } from "./use-internal-console-regional";

type Variant = "form" | "profile";

function RegionalFieldsBody({
  variant,
  showBillingPeriod,
  showDatePreview,
}: {
  variant: Variant;
  showBillingPeriod: boolean;
  showDatePreview: boolean;
}) {
  const { language, timeZone, billingPeriod, setLanguage, setTimeZone, setBillingPeriod, hydrated } =
    useInternalConsoleRegional();

  const resolved = useMemo(() => {
    const lang = resolveInternalConsoleLanguage(language);
    const tz = resolveInternalConsoleTimeZone(timeZone);
    return { lang, tz, sample: formatInternalConsoleDateTime(lang, tz) };
  }, [language, timeZone]);

  if (!hydrated) {
    return variant === "form" ? (
      <InternalSettingsReadonlyInput label="Default language" value="Loading…" />
    ) : (
      <InternalReadonlyField label="Language" value="Loading…" />
    );
  }

  const languageLabel = variant === "form" ? "Default language" : "Language";
  const timeZoneLabel = variant === "form" ? "Default time zone" : "Time zone";
  const billingLabel = variant === "form" ? "Credit billing period" : "Credit usage period";

  return (
    <>
      <InternalSettingsSelectField
        label={languageLabel}
        value={language}
        options={INTERNAL_CONSOLE_LANGUAGE_OPTIONS}
        onValueChange={value => setLanguage(value as InternalConsoleLanguagePreset)}
        hint="Saved in this browser for console labels and previews."
      />
      <InternalSettingsSelectField
        label={timeZoneLabel}
        value={timeZone}
        options={INTERNAL_CONSOLE_TIMEZONE_OPTIONS}
        onValueChange={value => setTimeZone(value as InternalConsoleTimezonePreset)}
        hint={`Effective: ${resolved.lang} · ${resolved.tz}`}
      />
      {showBillingPeriod ? (
        <InternalSettingsSelectField
          label={billingLabel}
          value={billingPeriod}
          options={INTERNAL_CONSOLE_BILLING_PERIOD_OPTIONS}
          onValueChange={value => setBillingPeriod(value as InternalConsoleBillingPeriod)}
          hint="Display preference for credit period copy in this console."
        />
      ) : null}
      {showDatePreview ? (
        variant === "form" ? (
          <InternalSettingsReadonlyInput label="Date & time preview" value={resolved.sample} />
        ) : (
          <InternalReadonlyField label="Date & time" value={resolved.sample} wrap />
        )
      ) : null}
    </>
  );
}

export function InternalConsoleRegionalFormFields({
  showBillingPeriod = true,
  showDatePreview = true,
}: {
  showBillingPeriod?: boolean;
  showDatePreview?: boolean;
}) {
  return (
    <RegionalFieldsBody variant="form" showBillingPeriod={showBillingPeriod} showDatePreview={showDatePreview} />
  );
}

export function InternalConsoleRegionalProfileFields() {
  return <RegionalFieldsBody variant="profile" showBillingPeriod showDatePreview />;
}
