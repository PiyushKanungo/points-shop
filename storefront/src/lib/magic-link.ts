import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "./env";
import { ShopError } from "./errors";

/**
 * Stateless magic-link tokens (design section 5): base64url(JSON payload) + "." +
 * base64url(HMAC-SHA256(MAGIC_LINK_SECRET, payload)). Times are epoch milliseconds; `iat` is the
 * issuedAt that Apex uses to make each link single use.
 */

export const LINK_TTL_MS = 15 * 60 * 1000;

export interface LinkPayload {
  email: string;
  iat: number;
  exp: number;
  ref?: string;
}

const INVALID = "This link is invalid or has expired. Request a new one.";

function sign(payload: string): string {
  return createHmac("sha256", getEnv().MAGIC_LINK_SECRET).update(payload).digest("base64url");
}

export function createToken(email: string, ref?: string, now = Date.now()): string {
  const payload: LinkPayload = { email, iat: now, exp: now + LINK_TTL_MS, ...(ref ? { ref } : {}) };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyToken(token: string, now = Date.now()): LinkPayload {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra !== undefined) throw new ShopError("UNAUTHORIZED", INVALID);

  const expected = Buffer.from(sign(encoded));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new ShopError("UNAUTHORIZED", INVALID);
  }

  let payload: LinkPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as LinkPayload;
  } catch {
    throw new ShopError("UNAUTHORIZED", INVALID);
  }
  if (
    typeof payload.email !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    payload.exp < now
  ) {
    throw new ShopError("UNAUTHORIZED", INVALID);
  }
  return payload;
}

export function linkFor(token: string): string {
  return `${getEnv().siteUrl}/auth/verify#token=${token}`;
}
