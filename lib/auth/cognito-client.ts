"use client";

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";
import { NewPasswordRequiredError } from "./errors";
import type { AuthUser } from "./types";

let pendingNewPasswordUser: CognitoUser | null = null;

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getUserPool() {
  return new CognitoUserPool({
    UserPoolId: requireEnv("NEXT_PUBLIC_COGNITO_USER_POOL_ID"),
    ClientId: requireEnv("NEXT_PUBLIC_COGNITO_CLIENT_ID"),
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

function finishNewPasswordChallenge(user: CognitoUser, newPassword: string) {
  return new Promise<AuthUser>((resolve, reject) => {
    user.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess(session) {
        pendingNewPasswordUser = null;
        resolve(sessionToUser(session));
      },
      onFailure(error) {
        reject(error);
      },
    });
  });
}

export function completeNewPasswordSignIn(newPassword: string) {
  const user = pendingNewPasswordUser;
  if (!user) {
    return Promise.reject(
      new Error("Sign-in session expired. Enter your email and temporary password again."),
    );
  }
  return finishNewPasswordChallenge(user, newPassword);
}

export function signIn(email: string, password: string) {
  pendingNewPasswordUser = null;
  const user = cognitoUser(email);
  const details = new AuthenticationDetails({
    Username: email.trim().toLowerCase(),
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
      newPasswordRequired() {
        pendingNewPasswordUser = user;
        reject(new NewPasswordRequiredError());
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
