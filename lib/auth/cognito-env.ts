/** Static env reads — required so Next.js inlines NEXT_PUBLIC_* in client bundles. */
export const cognitoEnv = {
  region: process.env.NEXT_PUBLIC_COGNITO_REGION?.trim() || "ap-southeast-1",
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID?.trim() || "",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID?.trim() || "",
};

export function assertCognitoConfigured() {
  if (!cognitoEnv.userPoolId) {
    throw new Error("NEXT_PUBLIC_COGNITO_USER_POOL_ID is not configured");
  }
  if (!cognitoEnv.clientId) {
    throw new Error("NEXT_PUBLIC_COGNITO_CLIENT_ID is not configured");
  }
}
