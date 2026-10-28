import type { Metadata } from "next";
import { Suspense } from "react";
import { InternalDashboard } from "@/components/internal/internal-dashboard";
import "./style.css";

export const metadata: Metadata = { title: "ARIA Internal — Operations" };

export default function InternalPage() {
  return (
    <>
      <Suspense fallback={<div className="internal-state p-10">Loading console…</div>}>
        <InternalDashboard />
      </Suspense>
    </>
  );
}
