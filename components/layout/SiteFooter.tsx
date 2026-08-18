"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";

/** Pages that end on a light background need a rounded dark footer transition. */
const ROUNDED_TOP_PATHS = ["/pricing", "/blog", "/docs", "/contact"];

export default function SiteFooter() {
  const pathname = usePathname();
  const roundedTop =
    ROUNDED_TOP_PATHS.includes(pathname) || pathname.startsWith("/blog/");

  return <Footer roundedTop={roundedTop} />;
}
