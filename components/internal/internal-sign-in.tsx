"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { AriaMark } from "@/components/aria-mark";
import { ARIA_IS_PREVIEW, ariaSignIn } from "@/lib/aria-session";

export function InternalSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    if (ARIA_IS_PREVIEW) {
      setError("Operator sign-in requires a running ARIA server with real authentication.");
      return;
    }
    setPending(true);
    try {
      const result = await ariaSignIn(email.trim(), password);
      if (!result.ok) { setError(result.message); return; }
      const access = await fetch("/api/admin/overview/", { credentials: "same-origin", cache: "no-store" });
      if (!access.ok) {
        const body = await access.json().catch(() => ({}));
        setError(access.status === 403 ? "This account is signed in but is not authorized for ARIA Internal."
          : body.message || "Internal access could not be verified. Try again.");
        return;
      }
      window.location.assign("/internal/");
    } catch {
      setError("Could not reach ARIA. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return <main className="internal-login">
    <div className="internal-login-grid" aria-hidden="true" />
    <header className="internal-login-header"><Link href="/" className="internal-login-brand" aria-label="ARIA home">
      <AriaMark /><span>ARIA</span><i /> <small>INTERNAL</small></Link>
      <span className="internal-login-classification"><ShieldCheck size={14} /> RESTRICTED ACCESS</span></header>
    <div className="internal-login-layout">
      <section className="internal-login-intro" aria-label="ARIA Internal">
        <div className="internal-login-orbit"><span className="internal-login-orbit-core"><AriaMark /></span></div>
        <span className="internal-login-index">01 / MISSION CONTROL</span>
        <h1>Clarity at<br />every level<span>.</span></h1>
        <p>The command center for ARIA accounts, workspaces, usage, and trusted operations.</p>
        <div className="internal-login-readout"><span><i /> VERIFIED IDENTITY</span><span><i /> AUDITED ACTIONS</span></div>
      </section>
      <section className="internal-login-panel" aria-label="Operator sign in">
        <div className="internal-login-panel-heading"><div className="internal-login-panel-icon"><LockKeyhole size={20} /></div>
          <span>ARIA / INTERNAL ACCESS</span><h2>Operator sign in</h2>
          <p>Use your authorized ARIA account to enter the console.</p></div>
        <form onSubmit={submit}>
          <label htmlFor="internal-email">Work email</label>
          <input id="internal-email" type="email" autoComplete="username" inputMode="email" required value={email} suppressHydrationWarning
            onChange={event => setEmail(event.target.value)} placeholder="name@company.com" />
          <div className="internal-login-password-label"><label htmlFor="internal-password">Password</label>
            <Link href="/forgot-password/">Forgot password?</Link></div>
          <div className="internal-login-password"><input id="internal-password" type={showPassword ? "text" : "password"} suppressHydrationWarning
            autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)}
            placeholder="Enter your password" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {error && <p className="internal-login-error" role="alert">{error}</p>}
          <button className="internal-login-submit" type="submit" disabled={pending || !email.trim() || !password}>
            {pending ? "Verifying access…" : "Enter console"}<ArrowRight size={18} /></button>
        </form>
        <div className="internal-login-panel-footer"><ShieldCheck size={16} /><span>Access is verified on every request. All changes are recorded.</span></div>
      </section>
    </div>
    <footer className="internal-login-footer"><span>THE BINARY LABS / ARIA</span><Link href="/chat/">Return to ARIA <ArrowRight size={14} /></Link></footer>
  </main>;
}
