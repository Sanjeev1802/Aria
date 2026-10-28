"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readInternalConsoleBillingPeriod,
  readInternalConsoleLanguagePreset,
  readInternalConsoleTimezonePreset,
  writeInternalConsoleBillingPeriod,
  writeInternalConsoleLanguagePreset,
  writeInternalConsoleTimezonePreset,
  type InternalConsoleBillingPeriod,
  type InternalConsoleLanguagePreset,
  type InternalConsoleTimezonePreset,
} from "@/lib/internal-console-regional";

export function useInternalConsoleRegional() {
  const [language, setLanguageState] = useState<InternalConsoleLanguagePreset>("browser");
  const [timeZone, setTimeZoneState] = useState<InternalConsoleTimezonePreset>("browser");
  const [billingPeriod, setBillingPeriodState] = useState<InternalConsoleBillingPeriod>("utc-month");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLanguageState(readInternalConsoleLanguagePreset());
    setTimeZoneState(readInternalConsoleTimezonePreset());
    setBillingPeriodState(readInternalConsoleBillingPeriod());
    setHydrated(true);
  }, []);

  const setLanguage = useCallback((value: InternalConsoleLanguagePreset) => {
    setLanguageState(value);
    writeInternalConsoleLanguagePreset(value);
  }, []);

  const setTimeZone = useCallback((value: InternalConsoleTimezonePreset) => {
    setTimeZoneState(value);
    writeInternalConsoleTimezonePreset(value);
  }, []);

  const setBillingPeriod = useCallback((value: InternalConsoleBillingPeriod) => {
    setBillingPeriodState(value);
    writeInternalConsoleBillingPeriod(value);
  }, []);

  return { language, timeZone, billingPeriod, setLanguage, setTimeZone, setBillingPeriod, hydrated };
}
