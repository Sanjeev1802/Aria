import { useSyncExternalStore } from "react";
import { ARIA_PREVIEW_PROFILE } from "@/lib/aria-profile-user";
import type { AriaPlanId } from "@/lib/aria-current-plan";
import { LOCAL_USER_HEADER, type LocalUserSlot } from "@/lib/local-user-shared";
import { readLocalUserSlot } from "@/lib/aria-local-dev";

export type AriaRole = "owner" | "admin" | "member";
export type AriaGlobalRole = "super_admin" | "admin" | "member" | "team_admin" | "team_member";
export type AriaModelChoice = "nova";

/**
 * Display copy of the server session. The server re-checks identity, membership,
 * plan, and balance on every request; nothing here grants access.
 */
export type AriaSession = {
  status: "loading" | "authenticated" | "unauthenticated" | "unavailable" | "preview";
  environment?: "development" | "production";
  liveChat?: boolean;
  /** Present only for internal operators; the server decides. */
  operator?: { role: "super_admin" | "admin" | "member" | "support" | "billing" | "operations"; canEdit: boolean };
  webSearchAvailable?: boolean;
  user?: { id: string; email: string; name: string; avatar?: string | null; aiAccessSuspended?: boolean;
    globalRole?: AriaGlobalRole };
  workspace?: { id: string; name: string; plan: AriaPlanId; planLabel: string; role: AriaRole; seatLimit: number; seatsUsed: number };
  entitlements?: { models: AriaModelChoice[]; apiAccess: boolean; teamManagement: boolean; monthlyCredits: number };
  workspaces?: { id: string; name: string; plan: AriaPlanId; planLabel: string; role: AriaRole }[];
  localDev?: boolean;
  /** Development stage: owners may switch plans to test each tier. */
  planSwitching?: boolean;
  localUser?: LocalUserSlot;
  localUsers?: { slot: LocalUserSlot; label: string }[];
};

export const ARIA_IS_PREVIEW = process.env.NEXT_PUBLIC_ARIA_PREVIEW === "true";
export const SESSION_UPDATED_EVENT = "aria:session-updated";
export const AUTH_NOTICE_EVENT = "aria:auth-notice";

const PREVIEW_SESSION: AriaSession = {
  status: "preview",
  user: { id: "preview", email: ARIA_PREVIEW_PROFILE.email, name: ARIA_PREVIEW_PROFILE.name },
  workspace: { id: "preview", name: "Studio workspace", plan: ARIA_PREVIEW_PROFILE.planId, planLabel: ARIA_PREVIEW_PROFILE.planLabel,
    role: "owner", seatLimit: 5, seatsUsed: 3 },
  entitlements: { models: ["nova"], apiAccess: true, teamManagement: true, monthlyCredits: 0 },
};
const LOADING: AriaSession = { status: "loading" };

let state: AriaSession = ARIA_IS_PREVIEW ? PREVIEW_SESSION : LOADING;
const listeners = new Set<() => void>();
let inflight: Promise<AriaSession> | null = null;
let lastSessionRefreshAt = 0;

function setState(next: AriaSession) {
  state = next;
  listeners.forEach(l => l());
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
}

export function loadAriaSession() { return state; }

export function useAriaSession(): AriaSession {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => listeners.delete(listener); },
    () => state,
    () => (ARIA_IS_PREVIEW ? PREVIEW_SESSION : LOADING),
  );
}

async function tryRefresh() {
  const response = await fetch("/api/auth/refresh/", { method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
  return Boolean(response?.ok);
}

/**
 * Same-origin API fetch that names the selected workspace and refreshes an
 * expired session once. Request bodies must be replayable (strings).
 */
export async function ariaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () => {
    const headers = new Headers(init.headers);
    if (state.status === "authenticated" && state.workspace) headers.set("X-Aria-Workspace", state.workspace.id);
    const localSlot = state.localUser ?? readLocalUserSlot();
    if (localSlot) headers.set(LOCAL_USER_HEADER, localSlot);
    if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(path, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  };
  let response = await send();
    if (response.status === 401) {
    const code = await response.clone().json().then(b => b?.code, () => undefined);
    if (code === "session_expired" && await tryRefresh()) response = await send();
    if (response.status === 401 && state.status !== "unauthenticated") {
      setState({ status: "unauthenticated" });
      if (code === "session_expired" || code === "session_revoked") {
        window.dispatchEvent(new CustomEvent(AUTH_NOTICE_EVENT, { detail: { code } }));
      }
    }
  }
  return response;
}

const SESSION_FETCH_MS = 12_000;

export function refreshAriaSession(options: { force?: boolean } = {}): Promise<AriaSession> {
  if (ARIA_IS_PREVIEW) return Promise.resolve(state);
  const now = Date.now();
  if (
    !options.force
    && inflight === null
    && state.status === "authenticated"
    && now - lastSessionRefreshAt < 2_000
  ) {
    return Promise.resolve(state);
  }
  inflight ??= (async () => {
    try {
      const headers = new Headers();
      // Prefer the signed-in account cookie; do not attach the dev user switcher header on session load.
      const response = await Promise.race([
        fetch("/api/auth/session/", { credentials: "same-origin", cache: "no-store", headers }),
        new Promise<Response>((_, reject) => {
          window.setTimeout(() => reject(new Error("session_timeout")), SESSION_FETCH_MS);
        }),
      ]);
      if (response.ok) {
        lastSessionRefreshAt = Date.now();
        setState({ status: "authenticated", ...(await response.json()) });
      }
      else if (response.status === 401) setState({ status: "unauthenticated" });
      else setState({ status: "unavailable" });
    } catch {
      /* timeout or network — leave state unchanged; chat will retry session load */
    } finally {
      inflight = null;
    }
    return state;
  })();
  return inflight;
}

export type AriaAuthResult = { ok: true; confirmationRequired?: boolean } | { ok: false; code: string; message: string };

async function authPost(path: string, body: unknown): Promise<AriaAuthResult> {
  try {
    const response = await fetch(path, { method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) return { ok: true, confirmationRequired: result.confirmationRequired };
    return { ok: false, code: result.code ?? "service_unavailable", message: result.message ?? "Sign-in is unavailable. Try again." };
  } catch {
    return { ok: false, code: "network_error", message: "Could not reach ARIA. Check your connection and try again." };
  }
}

export const ariaSignIn = (email: string, password: string) => authPost("/api/auth/sign-in/", { email, password });
export const ariaSignUp = (email: string, password: string, name = "") => authPost("/api/auth/sign-up/", { email, password, name });
export const ariaConfirmSignUp = (email: string, code: string) => authPost("/api/auth/confirm/", { email, code });
export const ariaResendCode = (email: string) => authPost("/api/auth/confirm/", { email, resend: true });
export const ariaForgotPassword = (email: string) => authPost("/api/auth/forgot-password/", { email });
export const ariaResetPassword = (email: string, code: string, password: string) =>
  authPost("/api/auth/reset-password/", { email, code, password });

export async function ariaSignOut() {
  if (!ARIA_IS_PREVIEW) await authPost("/api/auth/sign-out/", {});
  lastSessionRefreshAt = 0;
  setState(ARIA_IS_PREVIEW ? PREVIEW_SESSION : { status: "unauthenticated" });
}

export async function ariaSelectWorkspace(workspaceId: string) {
  const response = await ariaFetch("/api/workspace/select/", { method: "POST", body: JSON.stringify({ workspaceId }) });
  if (response.ok) {
    // The new selection must not be sent with the old workspace header.
    setState({ ...state, workspace: undefined });
    await refreshAriaSession();
    window.dispatchEvent(new Event("aria:credits-updated"));
  }
  return response.ok;
}

/** Visible name: stored display name, or a readable form of the email local-part. */
export function displayAccountName(name?: string, email?: string) {
  const given = name?.trim() ?? "";
  if (given && !given.includes("@")) return given;
  const local = (email || given).split("@")[0]?.trim() ?? "";
  if (!local) return "";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, char => char.toUpperCase());
}

/** Display profile for the signed-in user (or the design-preview persona). */
export function useAriaProfile() {
  const session = useAriaSession();
  const email = session.user?.email ?? "";
  return {
    session,
    name: displayAccountName(session.user?.name, email),
    handle: email.split("@")[0] ?? "",
    email,
    avatar: session.user?.avatar ?? "",
    planLabel: session.workspace ? (ARIA_IS_PREVIEW ? `${session.workspace.planLabel} (preview)` : session.workspace.planLabel) : "",
    planShort: session.workspace?.planLabel ?? (session.status === "loading" ? "" : "Not signed in"),
  };
}
