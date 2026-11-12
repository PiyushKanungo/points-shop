import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { ShopError } from "./errors";

export const CART_COOKIE = "ps_cart";
export const MAX_CART_ITEMS = 4;

const cartSchema = z.object({
  slugs: z.array(z.string().min(1).max(60)).max(MAX_CART_ITEMS),
  checkoutKey: z.string().min(8).max(80),
});

export type Cart = z.infer<typeof cartSchema>;

export function emptyCart(): Cart {
  return { slugs: [], checkoutKey: crypto.randomUUID() };
}

/** Invalid or missing cookie content counts as an empty cart. */
export function parseCart(raw: string | undefined): Cart {
  if (!raw) return emptyCart();
  try {
    const result = cartSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : emptyCart();
  } catch {
    return emptyCart();
  }
}

/** Pure helpers: a new checkout key whenever the contents change. */
export function withSlug(cart: Cart, slug: string): Cart {
  if (cart.slugs.includes(slug)) return cart;
  if (cart.slugs.length >= MAX_CART_ITEMS) {
    throw new ShopError("VALIDATION", `Your cart holds up to ${MAX_CART_ITEMS} offerings.`);
  }
  return { slugs: [...cart.slugs, slug], checkoutKey: crypto.randomUUID() };
}

export function withoutSlug(cart: Cart, slug: string): Cart {
  if (!cart.slugs.includes(slug)) return cart;
  return { slugs: cart.slugs.filter((s) => s !== slug), checkoutKey: crypto.randomUUID() };
}

export async function getCart(): Promise<Cart> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function saveCart(cart: Cart): Promise<void> {
  (await cookies()).set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearCart(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}
