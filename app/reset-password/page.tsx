import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password — ARIA",
  description: "Choose a new password for your ARIA account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center bg-background p-6 text-foreground scheme-dark md:p-10">
      <div className="w-full max-w-sm md:max-w-lg">
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
