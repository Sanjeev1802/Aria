import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";
import { randomBytes } from "crypto";

function getRegion() {
  return (
    process.env.AWS_REGION?.trim() ||
    process.env.NEXT_PUBLIC_COGNITO_REGION?.trim() ||
    "ap-southeast-1"
  );
}

function getUserPoolId() {
  return (
    process.env.COGNITO_USER_POOL_ID?.trim() ||
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID?.trim() ||
    ""
  );
}

function getClient() {
  return new CognitoIdentityProviderClient({ region: getRegion() });
}

function generateTemporaryPassword() {
  const base = randomBytes(12).toString("base64url");
  return `Aa1${base}`;
}

export async function activateInvitedUser(
  email: string,
  name: string,
  password: string,
) {
  const userPoolId = getUserPoolId();
  if (!userPoolId) {
    throw new Error("Cognito user pool is not configured.");
  }

  const username = email.trim().toLowerCase();
  const client = getClient();

  try {
    const existing = await client.send(
      new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      }),
    );

    if (existing.UserStatus === "CONFIRMED") {
      throw new Error(
        "An account with this email already exists. Sign in instead.",
      );
    }

    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: username,
        Password: password,
        Permanent: true,
      }),
    );
    return;
  } catch (err) {
    if (!(err instanceof UserNotFoundException)) {
      throw err;
    }
  }

  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: username,
      TemporaryPassword: generateTemporaryPassword(),
      MessageAction: "SUPPRESS",
      UserAttributes: [
        { Name: "email", Value: username },
        { Name: "email_verified", Value: "true" },
        { Name: "name", Value: name.trim() },
      ],
    }),
  );

  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: password,
      Permanent: true,
    }),
  );
}
