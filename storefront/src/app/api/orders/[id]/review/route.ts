import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, requireSession } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { errorResponse } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/origin";

const bodySchema = z.object({
  rating: z.number().int().min(1, "Rating must be 1 to 5.").max(5, "Rating must be 1 to 5."),
  text: z.string().trim().max(1000, "Keep it to 1,000 characters.").optional(),
});

export async function POST(request: Request, ctx: RouteContext<"/api/orders/[id]/review">) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { id } = await ctx.params;
    const { rating, text } = await readJson(request, bodySchema);
    return NextResponse.json(await getBackend().submitReview(session.walletId, id, rating, text || undefined));
  } catch (error) {
    return errorResponse(error);
  }
}
