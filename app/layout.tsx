import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "ARIA — Think once. Know more.",
  description: "Trusted models and the context you own, in one continuous conversation. Explore ARIA for intelligence, teamwork, and your next decision.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning: inline theme scripts (e.g. the internal console) set <html> attributes before hydration.
  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/Saans-Medium.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Applies the saved internal-console colour scheme before first paint; styles are scoped to .internal-*. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var r=document.documentElement;var t=localStorage.getItem("aria-internal-color-scheme-v2");r.dataset.internalTheme=t==="light"?"light":"dark";var a=localStorage.getItem("aria-theme-mode");var m=a==="light"?"light":"dark";r.setAttribute("data-aria-theme",m);r.style.colorScheme=m;}catch(e){document.documentElement.dataset.internalTheme="dark";document.documentElement.setAttribute("data-aria-theme","dark");}})();` }} />
      </head>
      <body>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
