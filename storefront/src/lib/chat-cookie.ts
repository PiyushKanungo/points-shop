import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "./env";

export const CHAT_COOKIE = "ps_chat";
const MAX_AGE_SECONDS = 60 * 60;

export interface Chat {
  walletId: string;
  chatKey: string;
  sessionId?: string;
}

function key() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

/** The signed chat for this wallet, or null (missing, expired, tampered or another wallet's). */
export async function getChat(walletId: string): Promise<Chat | null> {
  const token = (await cookies()).get(CHAT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: "chat" });
    if (payload.sub !== walletId || typeof payload.chatKey !== "string") return null;
    return {
      walletId,
      chatKey: payload.chatKey,
      sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
    };
  } catch {
    return null;
  }
}

export async function setChat(chat: Chat): Promise<void> {
  const token = await new SignJWT({ chatKey: chat.chatKey, ...(chat.sessionId ? { sessionId: chat.sessionId } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("chat")
    .setSubject(chat.walletId)
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
  (await cookies()).set(CHAT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearChat(): Promise<void> {
  (await cookies()).delete(CHAT_COOKIE);
}
