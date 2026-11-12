import "server-only";
import { getEnv } from "./env";
import { ShopError } from "./errors";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function clientIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}

/** Throws VALIDATION when the check fails and UNAVAILABLE when Cloudflare cannot be reached. */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<void> {
  if (!token) throw new ShopError("VALIDATION", "Please complete the check.");
  const body = new URLSearchParams({ secret: getEnv().TURNSTILE_SECRET_KEY, response: token });
  if (ip) body.set("remoteip", ip);

  let response: Response;
  try {
    response = await fetch(SITEVERIFY, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Turnstile siteverify failed", error);
    throw new ShopError("UNAVAILABLE");
  }
  if (!response.ok) throw new ShopError("UNAVAILABLE");
  const result = (await response.json().catch(() => ({}))) as { success?: boolean };
  if (!result.success) throw new ShopError("VALIDATION", "Please complete the check.");
}
