import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ARIA Workspace — Chat preview",
  description: "Explore General chat and ARIA Intelligence with decision brief export (preview).",
};

export default function ChatLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
