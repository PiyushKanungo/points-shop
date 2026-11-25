/** Cloudflare's public test keys always pass, so they count as "not configured" (BotID still runs). */
export function isRealTurnstileKey(key: string | undefined): boolean {
  return Boolean(key) && !/^[123]x0{10,}/.test(key as string);
}
