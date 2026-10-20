"use client";

import { useRef, useState } from "react";
import { WorkspaceBootstrapOverlay } from "@/components/auth/workspace-bootstrap-overlay";
import { clearInputError, showInputError } from "@/lib/show-input-error";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthSignUpForm() {
  const emailWrapRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bootstrap, setBootstrap] = useState(false);

  function onEmailInput() {
    clearInputError(emailWrapRef.current);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email) || password.trim().length < 8) {
      showInputError(emailWrapRef.current);
      return;
    }
    setBootstrap(true);
  }

  if (bootstrap) {
    return <WorkspaceBootstrapOverlay intent="sign-up" />;
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="auth-field">
        <label htmlFor="sign-up-name">Name</label>
        <div className="t-input">
          <input
            id="sign-up-name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>
      <div className="auth-field">
        <div ref={emailWrapRef} className="t-input-wrap">
          <label htmlFor="sign-up-email">Work email</label>
          <div className="t-input">
            <input
              id="sign-up-email"
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
          <p className="t-error-msg">Use a valid email and at least 8 characters for your password.</p>
        </div>
      </div>
      <div className="auth-field">
        <label htmlFor="sign-up-password">Password</label>
        <div className="t-input">
          <input
            id="sign-up-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <button type="submit" className="auth-submit">
        Create account
      </button>
    </form>
  );
}
