import { ServiceError } from "./errors";
import { readJson } from "./handlers";
import { authenticate } from "./request-context";
import type { Services } from "./services";

const AVATAR_PREFIX = "data:image/png;base64,";
const MAX_AVATAR_BYTES = 96_000;

export function validateAvatar(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !value.startsWith(AVATAR_PREFIX)) throw new ServiceError("invalid_avatar", 400);
  const encoded = value.slice(AVATAR_PREFIX.length);
  if (!encoded || encoded.length > Math.ceil(MAX_AVATAR_BYTES * 4 / 3) + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw new ServiceError("invalid_avatar", 400);
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 24 || bytes.length > MAX_AVATAR_BYTES || bytes.toString("base64") !== encoded ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR" ||
      bytes.readUInt32BE(16) !== 128 || bytes.readUInt32BE(20) !== 128) {
    throw new ServiceError("invalid_avatar", 400);
  }
  return value;
}

export async function profilePatchHandler(request: Request, services: Services) {
  const { user } = await authenticate(request, services);
  const body = await readJson(request, 140_000);
  if (body.name === undefined && body.avatar === undefined) throw new ServiceError("invalid_profile", 400);
  const name = body.name === undefined ? undefined : typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (name !== undefined && (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name))) {
    throw new ServiceError("invalid_profile_name", 400);
  }
  const avatar = body.avatar === undefined ? undefined : validateAvatar(body.avatar);
  const updated = await services.directory.updateProfile(user.id, { name, avatar });
  return Response.json({ user: { id: updated.id, email: updated.email, name: updated.name,
    avatar: await services.directory.getAvatar(user.id) } },
    { headers: { "Cache-Control": "no-store" } });
}
