import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";
import { OrderStatus } from "@/components/OrderStatus";
import { PageSkeleton } from "@/components/PageSkeleton";
import { getBackend } from "@/lib/backend";
import type { Order } from "@/lib/backend/types";
import { nextStepFor } from "@/lib/email/templates";
import { ShopError } from "@/lib/errors";
import { requirePageSession } from "@/lib/page-session";

export const metadata: Metadata = { title: "Order" };

function statusLine(order: Order): string {
  switch (order.status) {
    case "Awaiting Details":
      return `${nextStepFor(order.offering.fulfilmentType)} (The form arrives soon; for now Piyush will email you.)`;
    case "In Progress":
      return "Piyush has what he needs and is working on it.";
    case "Delivered":
      return "Delivered. Thanks for using the shop!";
    case "Cancelled":
      return "This order was cancelled and your points were returned.";
  }
}

async function OrderDetails({ params }: Pick<PageProps<"/orders/[id]">, "params">) {
  const { id } = await params;
  const session = await requirePageSession(`/orders/${id}`);
  let order: Order;
  try {
    order = await getBackend().getOrder(session.walletId, decodeURIComponent(id));
  } catch (error) {
    if (error instanceof ShopError && error.code === "NOT_FOUND") notFound();
    return <ErrorNotice error={error} />;
  }

  return (
    <article className="card space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{order.orderNumber}</p>
          <h1 className="text-2xl font-bold tracking-tight">{order.offering.name}</h1>
        </div>
        <OrderStatus status={order.status} />
      </div>
      <p>{statusLine(order)}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold">Points</dt>
          <dd className="text-muted">{order.pointsSpent}</dd>
        </div>
        <div>
          <dt className="font-semibold">Placed</dt>
          <dd className="text-muted">{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</dd>
        </div>
        {order.deliveredAt && (
          <div>
            <dt className="font-semibold">Delivered</dt>
            <dd className="text-muted">{new Date(order.deliveredAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export default function OrderPage(props: PageProps<"/orders/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/orders" className="text-sm text-muted underline">
        ← All orders
      </Link>
      <Suspense fallback={<PageSkeleton />}>
        <OrderDetails params={props.params} />
      </Suspense>
    </div>
  );
}
