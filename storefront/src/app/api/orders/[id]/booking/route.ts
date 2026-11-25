import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, requireSession } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { sendEmail } from "@/lib/email/send";
import { ownerDetailsAlert } from "@/lib/email/templates";
import { getEnv } from "@/lib/env";
import { errorResponse, ShopError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/origin";

const bodySchema = z.object({ start: z.iso.datetime("Pick a date and time.") });
const DAY = 24 * 60 * 60 * 1000;

/** Books a time on the site when the offering has no external booking link. */
export async function POST(request: Request, ctx: RouteContext<"/api/orders/[id]/booking">) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await ctx.params;
    const { start } = await readJson(request, bodySchema);
    const time = new Date(start).getTime();
    if (time < Date.now() + DAY || time > Date.now() + 60 * DAY) {
      throw new ShopError("VALIDATION", "Pick a time between 1 and 60 days from now.");
    }
    const order = await getBackend().saveBooking(session.walletId, id, `site:${id}`, start);
    await sendEmail({
      kind: "owner-alert",
      to: getEnv().OWNER_EMAIL,
      ...ownerDetailsAlert(session.email, order, `Requested time: ${new Date(start).toUTCString()}`),
    });
    return NextResponse.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
