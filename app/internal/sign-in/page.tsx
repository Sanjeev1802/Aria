import type { Metadata } from "next";
import { InternalSignIn } from "@/components/internal/internal-sign-in";

export const metadata: Metadata = {
  title: "Operator sign in — ARIA Internal",
  description: "Restricted sign in for authorized ARIA operators.",
};

export default function InternalSignInPage() {
  return <InternalSignIn />;
}
