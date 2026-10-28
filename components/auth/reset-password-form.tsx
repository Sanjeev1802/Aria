"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { ariaResetPassword } from "@/lib/aria-session";
import { clearInputError, showInputError } from "@/lib/show-input-error";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("Check the code and choose a password of at least 8 characters.");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{4,10}$/.test(code.trim()) || password.length < 8 || !email.trim()) {
      setError("Check the code and choose a password of at least 8 characters.");
      showInputError(wrapRef.current);
      return;
    }
    setPending(true);
    const result = await ariaResetPassword(email.trim(), code.trim(), password);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      showInputError(wrapRef.current);
      return;
    }
    router.push("/sign-in/?reset=1");
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="p-6 md:p-8">
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold">Choose a new password</h1>
              <p className="text-sm text-muted-foreground">Enter the code from your email and a new password.</p>
            </div>
            <Field>
              <div ref={wrapRef} className="t-input-wrap space-y-3">
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <FieldLabel htmlFor="code">Reset code</FieldLabel>
                <Input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <p className="t-error-msg text-sm text-destructive" role="alert">{error}</p>
              </div>
            </Field>
            <Field>
              <Button type="submit" className="w-full" disabled={pending}>{pending ? "Updating…" : "Update password"}</Button>
            </Field>
            <FieldDescription className="text-center">
              <Link href="/sign-in/">Back to sign in</Link>
            </FieldDescription>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
