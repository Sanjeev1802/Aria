export class NewPasswordRequiredError extends Error {
  readonly name = "NewPasswordRequired";
  readonly requiredAttributes: string[];

  constructor(requiredAttributes: string[] = []) {
    super("Set a new password to finish signing in.");
    this.requiredAttributes = requiredAttributes;
  }
}

export function isNewPasswordRequiredError(error: unknown): error is NewPasswordRequiredError {
  return (
    error instanceof NewPasswordRequiredError ||
    (typeof error === "object" &&
      error !== null &&
      (error as { name?: string }).name === "NewPasswordRequired")
  );
}

const COGNITO_MESSAGES: Record<string, string> = {
  UserNotFoundException: "Email or password is incorrect.",
  NotAuthorizedException: "Email or password is incorrect.",
  UserNotConfirmedException:
    "Confirm your email before signing in. Check your inbox for a code.",
  UsernameExistsException: "An account with this email already exists.",
  InvalidPasswordException:
    "Password does not meet the requirements. Use at least 8 characters.",
  InvalidParameterException: "Check the email and password and try again.",
  CodeMismatchException: "That confirmation code is incorrect.",
  ExpiredCodeException: "That confirmation code has expired. Request a new one.",
  LimitExceededException: "Too many attempts. Please try again later.",
  TooManyRequestsException: "Too many attempts. Please try again later.",
  TooManyFailedAttemptsException: "Too many attempts. Please try again later.",
  CodeDeliveryFailureException:
    "We could not send a verification code. Try again shortly.",
  PasswordResetRequiredException:
    "Your password must be reset before you can sign in. Use Forgot password.",
  InvalidSessionException:
    "Your sign-in session expired. Enter your email and password again.",
};

function cognitoErrorKey(error: object) {
  const record = error as {
    name?: string;
    code?: string;
    __type?: string;
  };
  const raw = record.name || record.code || record.__type || "";
  return raw.replace(/^com\.amazonaws\.cognito\.signin\.model\./, "");
}

export function authErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    if (error instanceof NewPasswordRequiredError) return error.message;
    const key = cognitoErrorKey(error);
    if (key && COGNITO_MESSAGES[key]) return COGNITO_MESSAGES[key];
    return error.message;
  }
  if (!error || typeof error !== "object") return fallback;
  const record = error as { message?: string };
  const key = cognitoErrorKey(error);
  if (key && COGNITO_MESSAGES[key]) return COGNITO_MESSAGES[key];
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }
  return fallback;
}
