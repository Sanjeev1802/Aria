import pg from "pg";

/** Aurora/RDS in AWS require TLS; loopback and local dev typically do not. */
export function createPgPool(connectionString: string, max = 10) {
  let host = "";
  try {
    host = new URL(connectionString.replace(/^postgresql:/i, "http:")).hostname;
  } catch {
    /* keep host empty */
  }
  const ssl = host.includes("amazonaws.com") ? { rejectUnauthorized: false } : undefined;
  return new pg.Pool({ connectionString, max, ssl });
}
