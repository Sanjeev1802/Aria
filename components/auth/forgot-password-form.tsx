"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ariaForgotPassword } from "@/lib/aria-session";
import { clearInputError, showInputError } from "@/lib/show-input-error";

export function ForgotPasswordForm() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("Enter a valid email address.");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      showInputError(wrapRef.current);
      return;
    }
    setPending(true);
    const result = await ariaForgotPassword(email.trim());
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      showInputError(wrapRef.current);
      return;
    }
    setSent(true);
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="p-6 md:p-8">
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold">Reset your password</h1>
              <p className="text-sm text-muted-foreground">
                {sent ? "If an account exists for that email, you will receive reset instructions." : "We will send a reset code to your email."}
              </p>
            </div>
            {sent ? (
              <Field>
                <Button asChild className="w-full">
                  <Link href={`/reset-password/?email=${encodeURIComponent(email.trim())}`}>Enter reset code</Link>
                </Button>
              </Field>
            ) : (
              <Field>
                <div ref={wrapRef} className="t-input-wrap space-y-2">
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" type="email" className="t-input" autoComplete="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); clearInputError(wrapRef.current); }} required />
                  <p className="t-error-msg text-sm text-destructive" role="alert">{error}</p>
                </div>
              </Field>
            )}
            {!sent ? (
              <Field>
                <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send reset code"}</Button>
              </Field>
            ) : null}
            <FieldDescription className="text-center">
              Need to confirm your email?{" "}
              <Link href={`/sign-up/?email=${encodeURIComponent(email.trim())}`}>Enter the code</Link>
              <br />
              <Link href="/sign-in/">Back to sign in</Link>
            </FieldDescription>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
