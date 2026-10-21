import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageFrame } from "@/components/auth/auth-page-frame";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password — ARIA",
  description: "Choose a new password for your ARIA account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthPageFrame maxWidthClass="md:max-w-lg">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPageFrame>
  );
}
