import type { Metadata } from "next";
import { InternalDashboard } from "@/components/internal/internal-dashboard";
import "./style.css";

export const metadata: Metadata = { title: "ARIA Internal — Operations" };

export default function InternalPage() {
  return <InternalDashboard />;
}
