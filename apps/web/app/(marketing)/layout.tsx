import Header from "@/components/layout/Header";
import CookieBanner from "@/components/layout/CookieBanner";
import SiteFooter from "@/components/layout/SiteFooter";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-w-0 flex-1">{children}</main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
