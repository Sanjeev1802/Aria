"use client";

import { useRef, useState } from "react";
import { WorkspaceBootstrapOverlay } from "@/components/auth/workspace-bootstrap-overlay";
import { clearInputError, showInputError } from "@/lib/show-input-error";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthSignInForm() {
  const emailWrapRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bootstrap, setBootstrap] = useState(false);

  function onEmailInput() {
    clearInputError(emailWrapRef.current);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      showInputError(emailWrapRef.current);
      return;
    }
    if (password.trim().length < 1) {
      showInputError(emailWrapRef.current);
      return;
    }
    setBootstrap(true);
  }

  if (bootstrap) {
    return <WorkspaceBootstrapOverlay intent="sign-in" />;
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="auth-field">
        <div ref={emailWrapRef} className="t-input-wrap">
          <label htmlFor="sign-in-email">Work email</label>
          <div className="t-input">
            <input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                onEmailInput();
              }}
            />
          </div>
          <p className="t-error-msg">Enter a valid email and password.</p>
        </div>
      </div>
      <div className="auth-field">
        <label htmlFor="sign-in-password">Password</label>
        <div className="t-input">
          <input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <button type="submit" className="auth-submit">
        Sign in
      </button>
    </form>
  );
}
