import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { sendEmail } from "@/lib/email/send";
import { ownerDetailsAlert } from "@/lib/email/templates";
import { getEnv } from "@/lib/env";
import { errorResponse, ShopError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/origin";
import { MAX_PRIVATE_RESUME_BYTES } from "@/lib/resume-url";

/** Stores the PDF as a private file on the order in Salesforce. */
export async function POST(request: Request, ctx: RouteContext<"/api/orders/[id]/resume">) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await ctx.params;
    if (Number(request.headers.get("content-length") ?? 0) > MAX_PRIVATE_RESUME_BYTES) {
      throw new ShopError("VALIDATION", "The PDF must be 2 MB or smaller.");
    }
    const pdf = Buffer.from(await request.arrayBuffer());
    if (pdf.length > MAX_PRIVATE_RESUME_BYTES) throw new ShopError("VALIDATION", "The PDF must be 2 MB or smaller.");
    if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new ShopError("VALIDATION", "Please choose a PDF file.");
    const order = await getBackend().saveResume(session.walletId, id, pdf.toString("base64"));
    await sendEmail({
      kind: "owner-alert",
      to: getEnv().OWNER_EMAIL,
      ...ownerDetailsAlert(session.email, order, "Resume uploaded: open the order's Files in Salesforce."),
    });
    return NextResponse.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
