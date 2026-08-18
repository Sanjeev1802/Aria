"use client";

import { RequireAuth } from "@/components/chat/RequireAuth";
import { AriaShell } from "@/components/chat/AriaShell";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <AriaShell />
    </RequireAuth>
  );
}
