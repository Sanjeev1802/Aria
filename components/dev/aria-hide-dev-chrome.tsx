"use client";

import { useEffect } from "react";
import "@/lib/disable-openui-inspect";
import { watchAndRemoveOpenUIDevtools } from "@/lib/remove-openui-devtools-dom";

/** Suppress OpenUI Inspect on every route. Does not block the browser's own DevTools. */
export function AriaHideDevChrome() {
  useEffect(() => watchAndRemoveOpenUIDevtools(), []);
  return null;
}
