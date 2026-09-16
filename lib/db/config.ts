export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

export function assertDatabaseConfigured() {
  if (!getDatabaseUrl()) {
    throw new Error(
      "DATABASE_URL is not configured. Run ./scripts/bootstrap-local-env.sh dev or set it in .env.local.",
    );
  }
}

export function isDatabaseConfigError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "PrismaClientInitializationError" ||
    error.message.includes("DATABASE_URL") ||
    error.message.includes("nonempty URL")
  );
}
