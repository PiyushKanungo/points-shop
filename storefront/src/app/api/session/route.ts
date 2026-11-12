import { connection, NextResponse } from "next/server";
import { getBackend } from "@/lib/backend";
import { getCart } from "@/lib/cart";
import { errorResponse, ShopError } from "@/lib/errors";
import { clearSession, getSession } from "@/lib/session";

const NO_STORE = { "Cache-Control": "no-store" };

/** What the header needs: who is signed in, their balance and the cart size. */
export async function GET() {
  // Request-time only: never prerendered (outside the try so Next.js's signal isn't caught).
  await connection();
  try {
    const cartCount = (await getCart()).slugs.length;
    const session = await getSession();
    if (!session) return NextResponse.json({ signedIn: false, cartCount }, { headers: NO_STORE });

    try {
      const wallet = await getBackend().getWallet(session.walletId);
      return NextResponse.json(
        { signedIn: true, email: wallet.email, balance: wallet.balance, taskCounts: wallet.taskCounts, cartCount },
        { headers: NO_STORE },
      );
    } catch (error) {
      if (error instanceof ShopError && error.code === "NOT_FOUND") {
        // The wallet no longer exists (for example deleted on request): sign out.
        await clearSession();
        return NextResponse.json({ signedIn: false, cartCount }, { headers: NO_STORE });
      }
      if (error instanceof ShopError) {
        return NextResponse.json(
          { signedIn: true, email: session.email, balance: null, taskCounts: {}, cartCount, error: error.code },
          { headers: NO_STORE },
        );
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
