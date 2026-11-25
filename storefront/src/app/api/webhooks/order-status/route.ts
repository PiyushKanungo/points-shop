import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { sendEmail } from "@/lib/email/send";
import { orderStatusEmail } from "@/lib/email/templates";
import { getEnv } from "@/lib/env";
import { errorResponse, ShopError } from "@/lib/errors";

const bodySchema = z.object({ orderId: z.string().regex(/^[A-Za-z0-9-]{1,40}$/) });

/**
 * Pinged by Salesforce when an order is delivered or cancelled. The ping is only a hint: Salesforce
 * is asked whether an email is due, and answers yes once per status, so a forged ping does nothing.
 */
export async function POST(request: Request) {
  try {
    const { orderId } = await readJson(request, bodySchema);
    const backend = getBackend();
    const notice = await backend.claimNotice(orderId);
    if (notice) {
      const sent = await sendEmail({
        kind: "order-status",
        to: notice.email,
        ...orderStatusEmail(getEnv().siteUrl, notice.order),
      });
      if (!sent) {
        await backend.releaseNotice(orderId);
        throw new ShopError("UNAVAILABLE");
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
