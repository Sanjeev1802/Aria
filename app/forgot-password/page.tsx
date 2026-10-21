import type { Metadata } from "next";
import { AuthPageFrame } from "@/components/auth/auth-page-frame";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password — ARIA",
  description: "Reset your ARIA account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageFrame maxWidthClass="md:max-w-lg">
      <ForgotPasswordForm />
    </AuthPageFrame>
  );
}
