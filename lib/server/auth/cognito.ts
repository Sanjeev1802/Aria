import { createHmac } from "node:crypto";
import {
  CognitoIdentityProviderClient, ConfirmForgotPasswordCommand, ConfirmSignUpCommand, ForgotPasswordCommand,
  InitiateAuthCommand, ResendConfirmationCodeCommand, RevokeTokenCommand, SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { ServiceError } from "../errors";

export type AuthTokens = { accessToken: string; idToken: string; refreshToken?: string };

/** Server-side identity provider operations. Passwords never reach the ledger or logs. */
export interface IdentityProvider {
  signIn(email: string, password: string): Promise<AuthTokens>;
  signUp(email: string, password: string, name: string): Promise<{ confirmationRequired: boolean }>;
  confirmSignUp(email: string, code: string): Promise<void>;
  resendCode(email: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  confirmForgotPassword(email: string, code: string, password: string): Promise<void>;
  refresh(refreshToken: string, subject: string): Promise<AuthTokens>;
  revoke(refreshToken: string): Promise<void>;
}

const ERROR_MAP: Record<string, [string, number]> = {
  NotAuthorizedException: ["invalid_credentials", 401],
  UserNotFoundException: ["invalid_credentials", 401],
  UserNotConfirmedException: ["account_not_confirmed", 403],
  UsernameExistsException: ["account_exists", 409],
  InvalidPasswordException: ["weak_password", 400],
  CodeMismatchException: ["invalid_code", 400],
  ExpiredCodeException: ["invalid_code", 400],
  TooManyRequestsException: ["auth_rate_limited", 429],
  LimitExceededException: ["auth_rate_limited", 429],
  TooManyFailedAttemptsException: ["auth_rate_limited", 429],
  InvalidParameterException: ["invalid_auth_request", 400],
  PasswordResetRequiredException: ["password_reset_required", 403],
};

function mapError(error: unknown): never {
  const mapped = ERROR_MAP[(error as Error)?.name];
  if (mapped) throw new ServiceError(mapped[0], mapped[1]);
  throw new ServiceError("identity_unavailable", 503);
}

export class CognitoIdentityProvider implements IdentityProvider {
  private client: CognitoIdentityProviderClient;
  constructor(private options: { region: string; clientId: string; clientSecret?: string }) {
    this.client = new CognitoIdentityProviderClient({ region: options.region });
  }

  private secretHash(username: string) {
    if (!this.options.clientSecret) return undefined;
    return createHmac("sha256", this.options.clientSecret).update(username + this.options.clientId).digest("base64");
  }

  async signIn(email: string, password: string) {
    const username = email.trim().toLowerCase();
    const secret = this.secretHash(username);
    const result = await this.client.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH", ClientId: this.options.clientId,
      AuthParameters: { USERNAME: username, PASSWORD: password, ...(secret ? { SECRET_HASH: secret } : {}) },
    })).catch(mapError);
    // MFA / forced password change need dedicated UI before they can be enabled on the pool.
    if (result.ChallengeName) throw new ServiceError("auth_challenge_unsupported", 501);
    const tokens = result.AuthenticationResult;
    if (!tokens?.AccessToken || !tokens.IdToken) throw new ServiceError("identity_unavailable", 503);
    return { accessToken: tokens.AccessToken, idToken: tokens.IdToken, refreshToken: tokens.RefreshToken };
  }

  async signUp(email: string, password: string, name: string) {
    const username = email.trim().toLowerCase();
    const secret = this.secretHash(username);
    const result = await this.client.send(new SignUpCommand({
      ClientId: this.options.clientId, Username: username, Password: password, SecretHash: secret,
      UserAttributes: [{ Name: "email", Value: username }, ...(name.trim() ? [{ Name: "name", Value: name.trim().slice(0, 100) }] : [])],
    })).catch(mapError);
    return { confirmationRequired: !result.UserConfirmed };
  }

  async confirmSignUp(email: string, code: string) {
    const username = email.trim().toLowerCase();
    await this.client.send(new ConfirmSignUpCommand({
      ClientId: this.options.clientId, Username: username, ConfirmationCode: code, SecretHash: this.secretHash(username),
    })).catch(mapError);
  }

  async resendCode(email: string) {
    const username = email.trim().toLowerCase();
    await this.client.send(new ResendConfirmationCodeCommand({
      ClientId: this.options.clientId, Username: username, SecretHash: this.secretHash(username),
    })).catch(mapError);
  }

  async forgotPassword(email: string) {
    const username = email.trim().toLowerCase();
    await this.client.send(new ForgotPasswordCommand({
      ClientId: this.options.clientId, Username: username, SecretHash: this.secretHash(username),
    })).catch(mapError);
  }

  async confirmForgotPassword(email: string, code: string, password: string) {
    const username = email.trim().toLowerCase();
    await this.client.send(new ConfirmForgotPasswordCommand({
      ClientId: this.options.clientId, Username: username, ConfirmationCode: code,
      Password: password, SecretHash: this.secretHash(username),
    })).catch(mapError);
  }

  async refresh(refreshToken: string, subject: string) {
    const secret = this.secretHash(subject);
    const result = await this.client.send(new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH", ClientId: this.options.clientId,
      AuthParameters: { REFRESH_TOKEN: refreshToken, ...(secret ? { SECRET_HASH: secret } : {}) },
    })).catch(error => {
      if ((error as Error)?.name === "NotAuthorizedException") throw new ServiceError("session_revoked", 401);
      mapError(error);
    });
    const tokens = result.AuthenticationResult;
    if (!tokens?.AccessToken || !tokens.IdToken) throw new ServiceError("session_revoked", 401);
    return { accessToken: tokens.AccessToken, idToken: tokens.IdToken, refreshToken: tokens.RefreshToken };
  }

  async revoke(refreshToken: string) {
    await this.client.send(new RevokeTokenCommand({
      ClientId: this.options.clientId, Token: refreshToken, ClientSecret: this.options.clientSecret,
    })).catch(() => undefined);
  }
}
