import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ARIA Workspace — Pricing",
  description: "Compare Free, Pro, and Max plans in your ARIA workspace.",
};

export default function PricingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
