import "server-only";
import { getEnv } from "./env";
import { ShopError } from "./errors";

/** State-changing routes accept only requests sent by pages of this site. */
export function assertSameOrigin(request: Request): void {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(getEnv().siteUrl).origin) {
    throw new ShopError("FORBIDDEN", "Bad origin.");
  }
}
