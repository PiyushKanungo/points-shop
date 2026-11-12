import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { readJson, requireSession } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { getCart, saveCart, withoutSlug, withSlug } from "@/lib/cart";
import { errorResponse, ShopError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/origin";

const bodySchema = z.object({ slug: z.string().min(1).max(60) });

export async function GET() {
  await connection();
  try {
    return NextResponse.json({ slugs: (await getCart()).slugs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireSession();
    const { slug } = await readJson(request, bodySchema);
    const catalog = await getBackend().getCatalog();
    if (!catalog.offerings.some((o) => o.slug === slug)) {
      throw new ShopError("NOT_FOUND", "That offering isn't available.");
    }
    const cart = withSlug(await getCart(), slug);
    await saveCart(cart);
    return NextResponse.json({ slugs: cart.slugs });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const { slug } = await readJson(request, bodySchema);
    const cart = withoutSlug(await getCart(), slug);
    await saveCart(cart);
    return NextResponse.json({ slugs: cart.slugs });
  } catch (error) {
    return errorResponse(error);
  }
}
