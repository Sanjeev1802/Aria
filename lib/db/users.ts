import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import type { CognitoIdToken } from "@/lib/auth/verify-jwt";

export function displayNameFromToken(payload: CognitoIdToken) {
  return (
    payload.name?.trim() ||
    payload.email?.split("@")[0] ||
    payload["cognito:username"] ||
    "User"
  );
}

export async function upsertUserFromToken(payload: CognitoIdToken): Promise<User> {
  const email = (payload.email || payload["cognito:username"] || "")
    .trim()
    .toLowerCase();
  if (!payload.sub || !email) {
    throw new Error("Token is missing subject or email");
  }

  const existing = await prisma.user.findUnique({
    where: { cognitoSub: payload.sub },
  });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        fullName: payload.name?.trim() || existing.fullName,
        status: "active",
      },
    });
  }

  const userCount = await prisma.user.count();
  return prisma.user.create({
    data: {
      cognitoSub: payload.sub,
      email,
      fullName: displayNameFromToken(payload),
      role: userCount === 0 ? "admin" : "user",
      status: "active",
    },
  });
}
