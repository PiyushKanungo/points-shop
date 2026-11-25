import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, requireSession } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { sendEmail } from "@/lib/email/send";
import { ownerDetailsAlert } from "@/lib/email/templates";
import { getEnv } from "@/lib/env";
import { errorResponse, ShopError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/origin";
import { isIssuedResumeUrl } from "@/lib/resume-url";

const bodySchema = z.union([
  z.object({ question: z.string().trim().min(20, "Write at least 20 characters.").max(2000, "Keep it to 2,000 characters.") }),
  z.object({ resumeUrl: z.string().max(255) }),
]);

/** Saves what an order needs: the question text or the uploaded resume's URL. */
export async function POST(request: Request, ctx: RouteContext<"/api/orders/[id]/details">) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = await readJson(request, bodySchema);
    if ("resumeUrl" in body && !isIssuedResumeUrl(body.resumeUrl, id)) {
      throw new ShopError("VALIDATION", "That file isn't the resume uploaded for this order.");
    }
    const order = await getBackend().saveDetails(session.walletId, id, body);
    if ("question" in body) {
      await sendEmail({
        kind: "owner-alert",
        to: getEnv().OWNER_EMAIL,
        replyTo: session.email,
        ...ownerDetailsAlert(session.email, order, body.question),
      });
    }
    return NextResponse.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
