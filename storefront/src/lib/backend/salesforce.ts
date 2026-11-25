import "server-only";
import { getEnv } from "../env";
import { isErrorCode, ShopError } from "../errors";
import type {
  Catalog,
  ChatReply,
  CheckoutResult,
  Order,
  ReviewResult,
  ShopBackend,
  TaskResult,
  VerifyResult,
  Wallet,
} from "./types";

/**
 * Calls the Apex REST API (/services/apexrest/shop/v1) as the integration user with the OAuth
 * client credentials flow. Error mapping follows the design's milestone 3 review resolutions.
 */

const TOKEN_TTL_MS = 25 * 60 * 1000;
const TIMEOUT_MS = 10_000;
const CHAT_TIMEOUT_MS = 40_000;

interface CachedToken {
  accessToken: string;
  instanceUrl: string;
  fetchedAt: number;
}

let token: CachedToken | undefined;

/** For tests only. */
export function resetTokenForTests() {
  token = undefined;
}

async function getToken(): Promise<CachedToken> {
  if (token && Date.now() - token.fetchedAt < TOKEN_TTL_MS) return token;
  const env = getEnv();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.SF_CLIENT_ID ?? "",
    client_secret: env.SF_CLIENT_SECRET ?? "",
  });
  let response: Response;
  try {
    response = await fetch(`${env.SF_LOGIN_URL}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Salesforce token request failed", error);
    throw new ShopError("UNAVAILABLE");
  }
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || typeof json.access_token !== "string" || typeof json.instance_url !== "string") {
    console.error("Salesforce token request rejected", response.status, json.error, json.error_description);
    throw new ShopError("UNAVAILABLE");
  }
  token = { accessToken: json.access_token, instanceUrl: json.instance_url, fetchedAt: Date.now() };
  return token;
}

function isExpiredSession(status: number, body: unknown): boolean {
  return (
    status === 401 &&
    Array.isArray(body) &&
    body.some((e) => (e as { errorCode?: string })?.errorCode === "INVALID_SESSION_ID")
  );
}

function toError(status: number, body: unknown): ShopError {
  if (Array.isArray(body)) {
    const limited = body.some(
      (e) => (e as { errorCode?: string })?.errorCode === "REQUEST_LIMIT_EXCEEDED",
    );
    if (limited || status >= 500) return new ShopError("UNAVAILABLE");
    console.error("Salesforce platform error", status, body);
    return new ShopError("INTERNAL", "Something went wrong.");
  }
  const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  if (error && isErrorCode(error.code)) {
    // Apex reports unexpected failures (including a full org) as INTERNAL: treat them as an outage.
    if (error.code === "INTERNAL") return new ShopError("UNAVAILABLE");
    return new ShopError(error.code, typeof error.message === "string" ? error.message : undefined);
  }
  if (status >= 500) return new ShopError("UNAVAILABLE");
  console.error("Unexpected Salesforce response", status, body);
  return new ShopError("INTERNAL", "Something went wrong.");
}

async function call<T>(method: "GET" | "POST", path: string, payload?: unknown, timeoutMs = TIMEOUT_MS): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { accessToken, instanceUrl } = await getToken();
    let response: Response;
    try {
      response = await fetch(`${instanceUrl}/services/apexrest/shop/v1/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: payload === undefined ? undefined : JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      console.error(`Salesforce ${method} ${path} failed`, error);
      throw new ShopError("UNAVAILABLE");
    }
    const body: unknown = await response.json().catch(() => null);
    if (response.ok) return body as T;
    if (attempt === 0 && isExpiredSession(response.status, body)) {
      token = undefined;
      continue;
    }
    throw toError(response.status, body);
  }
  throw new ShopError("UNAVAILABLE");
}

const enc = encodeURIComponent;

export const salesforceBackend: ShopBackend = {
  claimNotice: async (orderId) => {
    const r = await call<{ due: boolean; email: string; order: Order }>("POST", `notices/${enc(orderId)}/claim`, {});
    return r.due ? { email: r.email, order: r.order } : null;
  },

  releaseNotice: async (orderId) => {
    await call("POST", `notices/${enc(orderId)}/release`, {});
  },

  allow: async (key, max, windowMinutes) =>
    (await call<{ allowed: boolean }>("POST", "limit", { key, max, windowMinutes })).allowed,

  saveResume: async (walletId, orderId, pdf) =>
    (await call<{ order: Order }>("POST", `wallets/${enc(walletId)}/orders/${enc(orderId)}/resume`, { pdf }, 30_000))
      .order,

  startChat: async (walletId) =>
    (await call<{ chatKey: string }>("POST", `wallets/${enc(walletId)}/chat/start`, {})).chatKey,

  sendChat: (walletId, chatKey, text, sessionId) =>
    call<ChatReply>(
      "POST",
      `wallets/${enc(walletId)}/chat/message`,
      { chatKey, text, ...(sessionId ? { sessionId } : {}) },
      CHAT_TIMEOUT_MS,
    ),

  sendEmail: async (to, subject, html) => {
    await call("POST", "email", { ...(to ? { to } : { toOwner: true }), subject, html });
  },

  getCatalog: () => call<Catalog>("GET", "catalog"),

  verifySignIn: (email, issuedAt, referralCode) =>
    call<VerifyResult>("POST", "auth/verify", {
      email,
      issuedAt,
      ...(referralCode ? { referralCode } : {}),
    }),

  getWallet: async (walletId) =>
    (await call<{ wallet: Wallet }>("GET", `wallets/${enc(walletId)}`)).wallet,

  completeTask: (walletId, taskKey, evidence) =>
    call<TaskResult>(
      "POST",
      `wallets/${enc(walletId)}/tasks/${enc(taskKey)}`,
      evidence ? { evidence } : {},
    ),

  checkout: (walletId, checkoutKey, slugs) =>
    call<CheckoutResult>("POST", `wallets/${enc(walletId)}/checkout`, {
      checkoutKey,
      offerings: slugs,
    }),

  listOrders: async (walletId) =>
    (await call<{ orders: Order[] }>("GET", `wallets/${enc(walletId)}/orders`)).orders,

  getOrder: async (walletId, orderId) =>
    (await call<{ order: Order }>("GET", `wallets/${enc(walletId)}/orders/${enc(orderId)}`))
      .order,

  saveDetails: async (walletId, orderId, details) =>
    (
      await call<{ order: Order }>(
        "POST",
        `wallets/${enc(walletId)}/orders/${enc(orderId)}/details`,
        details,
      )
    ).order,

  saveBooking: async (walletId, orderId, bookingUid, bookingStart) =>
    (
      await call<{ order: Order }>(
        "POST",
        `wallets/${enc(walletId)}/orders/${enc(orderId)}/booking`,
        { bookingUid, bookingStart },
      )
    ).order,

  submitReview: (walletId, orderId, rating, text) =>
    call<ReviewResult>("POST", `wallets/${enc(walletId)}/orders/${enc(orderId)}/review`, {
      rating,
      ...(text ? { text } : {}),
    }),
};
