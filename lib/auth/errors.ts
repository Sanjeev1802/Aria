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
};

export function authErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const record = error as { name?: string; code?: string; message?: string };
  const key = record.name || record.code || "";
  if (key && COGNITO_MESSAGES[key]) return COGNITO_MESSAGES[key];
  if (typeof record.message === "string" && record.message.trim()) {
    if (/cognito|amazon/i.test(record.message)) return fallback;
    return record.message;
  }
  return fallback;
}
