import { NextResponse } from "next/server";
import { z } from "zod";
import { assertHuman } from "@/lib/bot-check";
import { readJson } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { getEnv } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";
import { errorResponse } from "@/lib/errors";
import { verifyToken } from "@/lib/magic-link";
import { assertSameOrigin } from "@/lib/origin";
import { setSession } from "@/lib/session";

const bodySchema = z.object({ token: z.string().min(10).max(2000) });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await assertHuman(request, undefined, false);
    const { token } = await readJson(request, bodySchema);
    const payload = verifyToken(token);
    const { wallet, isNew } = await getBackend().verifySignIn(payload.email, payload.iat, payload.ref);
    await setSession({ walletId: wallet.id, email: wallet.email });
    if (isNew) {
      await sendEmail({ kind: "welcome", to: wallet.email, ...welcomeEmail(getEnv().siteUrl, wallet.balance) });
    }
    return NextResponse.json({ ok: true, isNew });
  } catch (error) {
    return errorResponse(error);
  }
}
