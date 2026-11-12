import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { clearCart, getCart } from "@/lib/cart";
import { sendEmail } from "@/lib/email/send";
import { orderConfirmedEmail, ownerOrderAlert } from "@/lib/email/templates";
import { getEnv } from "@/lib/env";
import { errorResponse, ShopError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/origin";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const cart = await getCart();
    if (cart.slugs.length === 0) throw new ShopError("VALIDATION", "Your cart is empty.");

    const result = await getBackend().checkout(session.walletId, cart.checkoutKey, cart.slugs);
    await clearCart();

    if (!result.replay) {
      const env = getEnv();
      await Promise.all([
        sendEmail({ kind: "order-confirmed", to: session.email, ...orderConfirmedEmail(env.siteUrl, result.orders, result.balance) }),
        sendEmail({ kind: "owner-alert", to: env.OWNER_EMAIL, ...ownerOrderAlert(env.siteUrl, session.email, result.orders) }),
      ]);
    }
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
