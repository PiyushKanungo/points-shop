import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, requireSession } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { clearChat, getChat, setChat } from "@/lib/chat-cookie";
import { sendEmail } from "@/lib/email/send";
import { orderConfirmedEmail, ownerOrderAlert } from "@/lib/email/templates";
import { getEnv } from "@/lib/env";
import { errorResponse, ShopError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/origin";

export const maxDuration = 60;

const bodySchema = z.object({
  message: z.string().trim().min(1, "Type a message.").max(500, "Keep it to 500 characters."),
  /** True for the first message after the panel opens with no history: starts a fresh chat. */
  fresh: z.boolean().optional(),
});

/** One chat turn. The agent sees the visitor's text plus a server-held chat key; nothing else identifies the wallet. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { message, fresh } = await readJson(request, bodySchema);
    const backend = getBackend();

    let chat = fresh ? null : await getChat(session.walletId);
    chat ??= { walletId: session.walletId, chatKey: await backend.startChat(session.walletId) };

    let result;
    try {
      result = await backend.sendChat(session.walletId, chat.chatKey, message, chat.sessionId);
    } catch (error) {
      if (error instanceof ShopError && error.code === "INVALID_STATE") await clearChat();
      throw error;
    }
    await setChat({ ...chat, sessionId: result.sessionId });

    const placed = await emailNewOrders(session.walletId, session.email, result.reply);
    return NextResponse.json({ reply: result.reply, orderPlaced: placed });
  } catch (error) {
    return errorResponse(error);
  }
}

/** When the reply names an order placed in the last two minutes, sends the same emails as checkout. */
async function emailNewOrders(walletId: string, email: string, reply: string): Promise<boolean> {
  if (!/PS-\d+/.test(reply)) return false;
  try {
    const backend = getBackend();
    const orders = (await backend.listOrders(walletId)).filter(
      (o) =>
        reply.includes(o.orderNumber) &&
        o.status === "Awaiting Details" &&
        Date.now() - new Date(o.createdAt).getTime() < 2 * 60_000,
    );
    if (orders.length === 0) return false;
    const { balance } = await backend.getWallet(walletId);
    const env = getEnv();
    await Promise.all([
      sendEmail({ kind: "order-confirmed", to: email, ...orderConfirmedEmail(env.siteUrl, orders, balance) }),
      sendEmail({ kind: "owner-alert", to: env.OWNER_EMAIL, ...ownerOrderAlert(env.siteUrl, email, orders) }),
    ]);
    return true;
  } catch (error) {
    console.error("[concierge] order emails failed", error);
    return false;
  }
}
