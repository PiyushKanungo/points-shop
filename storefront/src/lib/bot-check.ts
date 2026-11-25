import "server-only";
import { createHmac } from "node:crypto";
import { checkBotId } from "botid/server";
import { getBackend } from "./backend";
import { getEnv } from "./env";
import { ShopError } from "./errors";
import { clientIp, verifyTurnstile } from "./turnstile";
import { isRealTurnstileKey } from "./turnstile-key";

/** Vercel BotID on every deployment, plus Turnstile when real keys are configured. Fails closed. */
export async function assertHuman(request: Request, turnstileToken?: string, hasForm = true): Promise<void> {
  const env = getEnv();
  if (env.VERCEL_ENV) {
    let isBot: boolean;
    try {
      isBot = (await checkBotId()).isBot;
    } catch (error) {
      console.error("[bot-check] BotID failed", error);
      throw new ShopError("UNAVAILABLE");
    }
    if (isBot) throw new ShopError("FORBIDDEN", "This looks automated. Reload the page and try again.");
  }
  if (hasForm && isRealTurnstileKey(env.TURNSTILE_SECRET_KEY)) await verifyTurnstile(turnstileToken, clientIp(request));
}

/** Counters live in Salesforce under keyed hashes, so no address or IP is stored. */
async function limit(scope: string, value: string, max: number, windowMinutes: number): Promise<void> {
  const hash = createHmac("sha256", getEnv().SESSION_SECRET).update(`${scope}:${value}`).digest("hex").slice(0, 60);
  if (!(await getBackend().allow(hash, max, windowMinutes))) {
    throw new ShopError("VALIDATION", "Too many attempts. Please try again later.");
  }
}

/** Limits sign-in emails: 5 per address and 20 per visitor an hour, 300 a day in total. */
export async function limitSignInEmails(request: Request, email: string): Promise<void> {
  await limit("email", email, 5, 60);
  const ip = clientIp(request);
  if (ip) await limit("ip", ip, 20, 60);
  await limit("all", "all", 300, 24 * 60);
}
