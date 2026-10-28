/** Matches the default Amazon Cognito password policy shown on sign-up. */
export const PASSWORD_HINT =
  "At least 8 characters, with upper and lower case, a number, and a symbol.";

export function meetsPasswordPolicy(value: string) {
  return value.length >= 8
    && /[a-z]/.test(value)
    && /[A-Z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
}
