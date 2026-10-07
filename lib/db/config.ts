function buildDatabaseUrlFromParts() {
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD?.trim();
  const name = process.env.DB_NAME?.trim() || "aria";

  if (!host || !user || !password) return "";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:5432/${name}?sslmode=require`;
}

export function getDatabaseUrl() {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;
  return buildDatabaseUrlFromParts();
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "DATABASE_URL is not configured. Run ./scripts/bootstrap-local-env.sh dev or set it in .env.local.",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

export function assertDatabaseConfigured() {
  if (!getDatabaseUrl()) {
    throw new DatabaseNotConfiguredError();
  }
}

export function isDatabaseConfigError(error: unknown) {
  return error instanceof DatabaseNotConfiguredError;
}

export function isDatabaseConnectionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "PrismaClientInitializationError" ||
    error.message.includes("Can't reach database server") ||
    error.message.includes("P1001") ||
    error.message.includes("P1000")
  );
}
