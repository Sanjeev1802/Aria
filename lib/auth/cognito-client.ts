"use client";

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";
import { assertCognitoConfigured, cognitoEnv } from "./cognito-env";
import { NewPasswordRequiredError } from "./errors";
import type { AuthUser } from "./types";

type PendingNewPassword = {
  user: CognitoUser;
  email: string;
  requiredAttributes: string[];
  userAttributes: Record<string, string>;
};

let pendingNewPassword: PendingNewPassword | null = null;

export function getUserPool() {
  assertCognitoConfigured();
  return new CognitoUserPool({
    UserPoolId: cognitoEnv.userPoolId,
    ClientId: cognitoEnv.clientId,
  });
}

function cognitoUser(email: string) {
  return new CognitoUser({
    Username: email.trim().toLowerCase(),
    Pool: getUserPool(),
  });
}

export function sessionToUser(session: CognitoUserSession): AuthUser {
  const idToken = session.getIdToken();
  const payload = idToken.decodePayload();
  const email =
    (typeof payload.email === "string" && payload.email) ||
    (typeof payload["cognito:username"] === "string"
      ? payload["cognito:username"]
      : "");
  const name =
    (typeof payload.name === "string" && payload.name) ||
    (typeof payload.given_name === "string" && payload.given_name) ||
    null;

  return {
    sub: String(payload.sub ?? ""),
    email,
    displayName: name,
    idToken: idToken.getJwtToken(),
  };
}

export function signUp(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  const email = input.email.trim().toLowerCase();
  const attributes = [
    new CognitoUserAttribute({ Name: "email", Value: email }),
    new CognitoUserAttribute({
      Name: "name",
      Value: input.fullName.trim(),
    }),
  ];

  return new Promise<{ userConfirmed: boolean }>((resolve, reject) => {
    getUserPool().signUp(email, input.password, attributes, [], (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Unable to create account."));
        return;
      }
      resolve({ userConfirmed: result.userConfirmed });
    });
  });
}

export function confirmSignUp(email: string, code: string) {
  return new Promise<void>((resolve, reject) => {
    cognitoUser(email).confirmRegistration(code.trim(), true, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export function resendConfirmationCode(email: string) {
  return new Promise<void>((resolve, reject) => {
    cognitoUser(email).resendConfirmationCode((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

const READ_ONLY_USER_ATTRIBUTES = new Set([
  "email_verified",
  "phone_number_verified",
  "sub",
  "identities",
  "cognito:user_status",
  "cognito:mfa_enabled",
]);

function isMutableUserAttribute(key: string) {
  return !READ_ONLY_USER_ATTRIBUTES.has(key) && !key.startsWith("cognito:");
}

function buildRequiredAttributes(
  pending: PendingNewPassword,
  extra: Record<string, string>,
) {
  const attributes: Record<string, string> = {};

  for (const key of pending.requiredAttributes) {
    if (!isMutableUserAttribute(key)) continue;
    const value = extra[key]?.trim() || pending.userAttributes[key]?.trim();
    if (value) attributes[key] = value;
  }

  for (const key of pending.requiredAttributes) {
    if (attributes[key]?.trim()) continue;
    if (key === "name") {
      const localPart = pending.email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
      attributes.name = localPart
        ? localPart.replace(/\b\w/g, (char) => char.toUpperCase())
        : "ARIA User";
    }
  }

  return attributes;
}

function finishNewPasswordChallenge(
  pending: PendingNewPassword,
  newPassword: string,
  extraAttributes: Record<string, string> = {},
) {
  const user = pending.user;
  const attributeData = buildRequiredAttributes(pending, extraAttributes);

  return new Promise<AuthUser>((resolve, reject) => {
    user.completeNewPasswordChallenge(newPassword, attributeData, {
      onSuccess(session) {
        pendingNewPassword = null;
        resolve(sessionToUser(session));
      },
      onFailure(error) {
        reject(error);
      },
    });
  });
}

export function getPendingNewPasswordRequirements() {
  if (!pendingNewPassword) return null;
  return {
    requiredAttributes: pendingNewPassword.requiredAttributes,
    userAttributes: pendingNewPassword.userAttributes,
  };
}

export function completeNewPasswordSignIn(
  newPassword: string,
  extraAttributes: Record<string, string> = {},
) {
  const pending = pendingNewPassword;
  if (!pending) {
    return Promise.reject(
      new Error("Sign-in session expired. Enter your email and temporary password again."),
    );
  }
  return finishNewPasswordChallenge(pending, newPassword, extraAttributes);
}

export function signIn(email: string, password: string) {
  pendingNewPassword = null;
  const normalizedEmail = email.trim().toLowerCase();
  const user = cognitoUser(normalizedEmail);
  const details = new AuthenticationDetails({
    Username: normalizedEmail,
    Password: password,
  });

  return new Promise<AuthUser>((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess(session) {
        resolve(sessionToUser(session));
      },
      onFailure(error) {
        reject(error);
      },
      newPasswordRequired(userAttributes, requiredAttributes) {
        const required = Array.isArray(requiredAttributes) ? requiredAttributes : [];
        pendingNewPassword = {
          user,
          email: normalizedEmail,
          requiredAttributes: required,
          userAttributes:
            userAttributes && typeof userAttributes === "object" ? userAttributes : {},
        };
        reject(new NewPasswordRequiredError(required));
      },
    });
  });
}

export function signOutCurrentUser() {
  const current = getUserPool().getCurrentUser();
  current?.signOut();
}

export function getCurrentSession() {
  let current: CognitoUser | null = null;
  try {
    current = getUserPool().getCurrentUser();
  } catch {
    return Promise.resolve(null);
  }
  if (!current) return Promise.resolve(null);

  return new Promise<AuthUser | null>((resolve) => {
    current.getSession((error: Error | null, session: CognitoUserSession | null) => {
      if (error || !session?.isValid()) {
        resolve(null);
        return;
      }
      resolve(sessionToUser(session));
    });
  });
}

export function forgotPassword(email: string) {
  return new Promise<void>((resolve, reject) => {
    cognitoUser(email).forgotPassword({
      onSuccess() {
        resolve();
      },
      onFailure(error) {
        reject(error);
      },
    });
  });
}

export function confirmForgotPassword(input: {
  email: string;
  code: string;
  password: string;
}) {
  return new Promise<void>((resolve, reject) => {
    cognitoUser(input.email).confirmPassword(input.code.trim(), input.password, {
      onSuccess() {
        resolve();
      },
      onFailure(error) {
        reject(error);
      },
    });
  });
}
