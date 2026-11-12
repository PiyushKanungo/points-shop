import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "@/components/CartView";
import { ErrorNotice } from "@/components/ErrorNotice";
import { PageSkeleton } from "@/components/PageSkeleton";
import { getBackend } from "@/lib/backend";
import { getCart } from "@/lib/cart";
import { getCachedCatalog } from "@/lib/catalog";
import { requirePageSession } from "@/lib/page-session";

export const metadata: Metadata = { title: "Your cart" };

async function Cart() {
  const session = await requirePageSession("/cart");
  const cart = await getCart();
  let data;
  try {
    data = await Promise.all([getCachedCatalog(), getBackend().getWallet(session.walletId)]);
  } catch (error) {
    return <ErrorNotice error={error} />;
  }
  const [catalog, wallet] = data;
  const lines = cart.slugs
    .map((slug) => catalog.offerings.find((o) => o.slug === slug))
    .filter((o) => o !== undefined);
  return <CartView initialLines={lines} balance={wallet.balance} />;
}

export default function CartPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Your cart</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Cart />
      </Suspense>
    </div>
  );
}
