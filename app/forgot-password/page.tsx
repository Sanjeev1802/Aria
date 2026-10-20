import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password — ARIA",
  description: "Reset your ARIA account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center bg-background p-6 text-foreground scheme-dark md:p-10">
      <div className="w-full max-w-sm md:max-w-lg">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
