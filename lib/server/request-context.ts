import { ServiceError } from "./errors";
import { readSessionTokens } from "./auth/cookies";
import { entitlementFor, requirePermission, type Entitlement, type Permission } from "./accounts/entitlements";
import type { Identity, Membership, UserRecord, WorkspaceRecord } from "./accounts/directory";
import { LOCAL_ACCOUNT_COOKIE } from "@/lib/local-user-shared";
import { LocalIdentityProvider } from "./auth/local-identity-provider";
import { resolveLocalUser } from "./local-dev";
import type { Services } from "./services";

export const WORKSPACE_HEADER = "x-aria-workspace";
const LOOPBACK = ["localhost", "127.0.0.1", "[::1]"];

export type AuthContext = { identity: Identity; user: UserRecord };
export type WorkspaceContext = AuthContext & { workspace: WorkspaceRecord; membership: Membership; plan: Entitlement };

/** Cookie-authenticated writes must come from the app's own origin. */
export function assertSameOrigin(request: Request, services: Services) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const expected = services.config.appOrigin ?? (services.config.environment === "development" ? new URL(request.url).origin : undefined);
  const origin = request.headers.get("origin");
  if (!expected || origin !== expected) throw new ServiceError("invalid_origin", 403);
}

function isLoopback(request: Request) {
  return LOOPBACK.includes(new URL(request.url).hostname);
}

function readCookie(header: string | null, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function verifyIdentity(request: Request, services: Services): Promise<Identity> {
  const { config, verifier } = services;
  const tokens = readSessionTokens(request, config.secureCookies);
  if (verifier && (tokens.accessToken || tokens.idToken || !config.localIdentity)) return verifier.verify(tokens);
  if (config.localIdentity && config.environment === "development") {
    if (!isLoopback(request)) throw new ServiceError("local_development_only", 403);
    const accountEmail = readCookie(request.headers.get("cookie"), LOCAL_ACCOUNT_COOKIE);
    if (accountEmail && services.idp instanceof LocalIdentityProvider) {
      const custom = await services.idp.identityForEmail(accountEmail);
      if (custom) return custom;
    }
    return resolveLocalUser(request).identity;
  }
  throw new ServiceError("not_signed_in", 401);
}

export async function authenticate(request: Request, services: Services): Promise<AuthContext> {
  assertSameOrigin(request, services);
  const identity = await verifyIdentity(request, services);
  const user = await services.directory.ensureAccount(identity);
  services.directory.assertSessionValid(user, identity);
  return { identity, user };
}

/**
 * Authenticates, resolves the workspace from server-side membership, and checks
 * the role permission. The workspace header selects; it never grants.
 */
export async function requireWorkspace(request: Request, services: Services, permission: Permission): Promise<WorkspaceContext> {
  const auth = await authenticate(request, services);
  const requested = request.headers.get(WORKSPACE_HEADER);
  const { workspace, membership } = await services.directory.resolveWorkspace(auth.user, requested);
  requirePermission(membership.role, permission);
  return { ...auth, workspace, membership, plan: entitlementFor(workspace.plan) };
}
