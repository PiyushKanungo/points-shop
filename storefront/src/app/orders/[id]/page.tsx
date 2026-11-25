import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorNotice } from "@/components/ErrorNotice";
import { FulfilmentForm } from "@/components/FulfilmentForm";
import { OrderStatus } from "@/components/OrderStatus";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ReviewForm } from "@/components/ReviewForm";
import { getBackend } from "@/lib/backend";
import type { Order } from "@/lib/backend/types";
import { getCachedCatalog } from "@/lib/catalog";
import { nextStepFor } from "@/lib/email/templates";
import { getEnv } from "@/lib/env";
import { ShopError } from "@/lib/errors";
import { requirePageSession } from "@/lib/page-session";
import type { Session } from "@/lib/session";

export const metadata: Metadata = { title: "Order" };

const DATE_TIME = { dateStyle: "medium", timeStyle: "short" } as const;

function statusLine(order: Order): string {
  switch (order.status) {
    case "Awaiting Details":
      return nextStepFor(order.offering.fulfilmentType);
    case "In Progress":
      return "Piyush has what he needs and is working on it.";
    case "Delivered":
      return "Delivered. Thanks for using the shop!";
    case "Cancelled":
      return "This order was cancelled and your points were returned.";
  }
}

/** Cal.com link for this order, prefilled so the booking webhook can find the order. */
async function bookingLinkFor(order: Order, session: Session): Promise<string | null> {
  if (order.offering.fulfilmentType !== "Booking") return null;
  try {
    const offering = (await getCachedCatalog()).offerings.find((o) => o.slug === order.offering.slug);
    if (!offering?.bookingUrl) return null;
    const url = new URL(offering.bookingUrl);
    url.searchParams.set("email", session.email);
    url.searchParams.set("metadata[walletId]", session.walletId);
    url.searchParams.set("metadata[orderId]", order.id);
    return url.toString();
  } catch {
    return null;
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
  const bookingLink = order.status === "Awaiting Details" ? await bookingLinkFor(order, session) : null;

  return (
    <article className="card space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{order.orderNumber}</p>
          <h1 className="text-2xl font-bold tracking-tight">{order.offering.name}</h1>
        </div>
        <OrderStatus status={order.status} />
      </div>
      <p>{statusLine(order)}</p>

      {order.status === "Awaiting Details" && (
        <section className="rounded-xl border border-line bg-paper p-5">
          <FulfilmentForm orderId={order.id} fulfilmentType={order.offering.fulfilmentType} bookingLink={bookingLink} privateResume={!getEnv().BLOB_READ_WRITE_TOKEN} />
        </section>
      )}

      {(order.question || order.resumeUrl || order.bookingStart) && (
        <section className="space-y-1 text-sm">
          <h2 className="font-semibold">What you sent</h2>
          {order.question && <p className="whitespace-pre-wrap text-muted">{order.question}</p>}
          {order.resumeUrl && !order.resumeUrl.includes(".blob.vercel-storage.com/") && (
            <p className="text-muted">Your resume (PDF) is saved privately with this order.</p>
          )}
          {order.resumeUrl?.includes(".blob.vercel-storage.com/") && (
            <p>
              <a href={order.resumeUrl} target="_blank" rel="noopener" className="text-accent underline">
                Your resume (PDF)
              </a>
            </p>
          )}
          {order.bookingStart && (
            <p className="text-muted">Time: {new Date(order.bookingStart).toLocaleString("en-IN", { ...DATE_TIME, timeZone: "Asia/Kolkata" })} IST</p>
          )}
        </section>
      )}

      {order.status === "Delivered" && (
        <section className="rounded-xl border border-line bg-paper p-5">
          {order.review ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Your review: {"★".repeat(order.review.rating)}</p>
              {order.review.text && <p className="text-muted">{order.review.text}</p>}
            </div>
          ) : (
            <ReviewForm orderId={order.id} />
          )}
        </section>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold">Points</dt>
          <dd className="text-muted">{order.pointsSpent}</dd>
        </div>
        <div>
          <dt className="font-semibold">Placed</dt>
          <dd className="text-muted">{new Date(order.createdAt).toLocaleString("en-IN", { ...DATE_TIME, timeZone: "Asia/Kolkata" })}</dd>
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
