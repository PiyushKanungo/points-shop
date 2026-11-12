import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";
import { OrderStatus } from "@/components/OrderStatus";
import { PageSkeleton } from "@/components/PageSkeleton";
import { getBackend } from "@/lib/backend";
import { ShopError } from "@/lib/errors";
import { requirePageSession } from "@/lib/page-session";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Your orders" };

async function Orders({ searchParams }: Pick<PageProps<"/orders">, "searchParams">) {
  const session = await requirePageSession("/orders");
  const placed = (await searchParams).placed === "1";
  let orders;
  try {
    orders = await getBackend().listOrders(session.walletId);
  } catch (error) {
    if (error instanceof ShopError && error.code === "NOT_FOUND") redirect("/signin?reason=expired");
    return <ErrorNotice error={error} />;
  }

  return (
    <div className="space-y-4">
      {placed && (
        <p role="status" className="card border-[#bbf7d0] bg-good-soft p-4 font-medium text-good">
          Order placed. Check your email for what happens next.
        </p>
      )}
      {orders.length === 0 ? (
        <div className="card space-y-3 p-6">
          <p>No orders yet.</p>
          <Link href="/" className="btn-primary">
            Browse offerings
          </Link>
        </div>
      ) : (
        <ul className="card divide-y divide-line">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${encodeURIComponent(order.id)}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-paper"
              >
                <div>
                  <p className="font-medium">
                    {order.orderNumber} · {order.offering.name}
                  </p>
                  <p className="text-sm text-muted">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })} ·{" "}
                    {order.pointsSpent} pts
                  </p>
                </div>
                <OrderStatus status={order.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OrdersPage(props: PageProps<"/orders">) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Your orders</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Orders searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
