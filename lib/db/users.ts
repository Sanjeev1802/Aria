import type { User, UserRole } from "@prisma/client";
import { cacheDel, cacheGet, cacheSet } from "@/lib/cache/redis";
import { prisma } from "./prisma";
import type { CognitoIdToken } from "@/lib/auth/verify-jwt";

const USER_CACHE_TTL_SEC = 60;

type CachedUser = Omit<User, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

function userCacheKey(cognitoSub: string) {
  return `user:${cognitoSub}`;
}

function reviveUser(cached: CachedUser): User {
  return {
    ...cached,
    createdAt: new Date(cached.createdAt),
    updatedAt: new Date(cached.updatedAt),
  };
}

async function rememberUser(user: User) {
  if (!user.cognitoSub) return;
  await cacheSet(userCacheKey(user.cognitoSub), user, USER_CACHE_TTL_SEC);
}

async function forgetUser(cognitoSub: string | null | undefined) {
  if (!cognitoSub) return;
  await cacheDel(userCacheKey(cognitoSub));
}

function pendingCognitoSub(email: string) {
  return `invited:${email.trim().toLowerCase()}`;
}

export function displayNameFromToken(payload: CognitoIdToken) {
  return (
    payload.name?.trim() ||
    payload.email?.split("@")[0] ||
    payload["cognito:username"] ||
    "User"
  );
}

export async function createInvitedUser(input: {
  email: string;
  fullName: string;
  role: UserRole;
}) {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing?.status === "active") {
    throw new Error("A user with this email already exists.");
  }

  if (existing?.status === "invited") {
    return prisma.user.update({
      where: { id: existing.id },
      data: { fullName, role: input.role, status: "invited" },
    });
  }

  return prisma.user.create({
    data: {
      email,
      fullName,
      role: input.role,
      status: "invited",
      cognitoSub: pendingCognitoSub(email),
    },
  });
}

export async function activateInvitedUserRecord(
  email: string,
  cognitoSub: string,
) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });

  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        cognitoSub,
        status: "active",
      },
    });
    await forgetUser(existing.cognitoSub);
    await rememberUser(user);
    return user;
  }

  const userCount = await prisma.user.count();
  const user = await prisma.user.create({
    data: {
      email: normalized,
      fullName: normalized.split("@")[0] || "User",
      cognitoSub,
      role: userCount === 0 ? "admin" : "user",
      status: "active",
    },
  });
  await rememberUser(user);
  return user;
}

export async function upsertUserFromToken(payload: CognitoIdToken): Promise<User> {
  const email = (payload.email || payload["cognito:username"] || "")
    .trim()
    .toLowerCase();
  if (!payload.sub || !email) {
    throw new Error("Token is missing subject or email");
  }

  const tokenName = payload.name?.trim();
  const cached = await cacheGet<CachedUser>(userCacheKey(payload.sub));
  if (
    cached &&
    cached.email === email &&
    cached.status === "active" &&
    (!tokenName || cached.fullName === tokenName)
  ) {
    return reviveUser(cached);
  }

  const existingBySub = await prisma.user.findUnique({
    where: { cognitoSub: payload.sub },
  });
  if (existingBySub) {
    const user = await prisma.user.update({
      where: { id: existingBySub.id },
      data: {
        email,
        fullName: tokenName || existingBySub.fullName,
        status: "active",
      },
    });
    await rememberUser(user);
    return user;
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    const user = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        cognitoSub: payload.sub,
        fullName: tokenName || existingByEmail.fullName,
        status: "active",
      },
    });
    await forgetUser(existingByEmail.cognitoSub);
    await rememberUser(user);
    return user;
  }

  const userCount = await prisma.user.count();
  const user = await prisma.user.create({
    data: {
      cognitoSub: payload.sub,
      email,
      fullName: displayNameFromToken(payload),
      role: userCount === 0 ? "admin" : "user",
      status: "active",
    },
  });
  await rememberUser(user);
  return user;
}

export async function updateUserRoleRecord(
  id: string,
  role: UserRole,
  actorId: string,
) {
  const users = await prisma.user.findMany({
    select: { id: true, role: true },
  });
  const target = users.find((user) => user.id === id);
  if (!target) {
    throw new Error("User not found.");
  }

  if (target.id === actorId && role !== "admin") {
    const adminCount = users.filter((user) => user.role === "admin").length;
    if (adminCount <= 1) {
      throw new Error("You can’t remove the last admin.");
    }
  }

  if (target.role === "admin" && role === "user") {
    const adminCount = users.filter((user) => user.role === "admin").length;
    if (adminCount <= 1) {
      throw new Error("At least one admin is required.");
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role },
  });
  await rememberUser(user);
  return user;
}

export async function removeUserRecord(id: string, actorId: string) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new Error("User not found.");
  }

  if (target.id === actorId) {
    throw new Error("You can’t remove your own account here.");
  }

  if (target.role === "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      throw new Error("At least one admin is required.");
    }
  }

  await prisma.user.delete({ where: { id } });
  await forgetUser(target.cognitoSub);
  return target;
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  };
}
