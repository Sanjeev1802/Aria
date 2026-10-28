import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AriaHideDevChrome } from "@/components/dev/aria-hide-dev-chrome";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ARIA — Think once. Know more.",
  description: "Trusted models and the context you own, in one continuous conversation. Explore ARIA for intelligence, teamwork, and your next decision.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning: inline theme scripts (e.g. the internal console) set <html> attributes before hydration.
  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <body>
        <AriaHideDevChrome />
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
