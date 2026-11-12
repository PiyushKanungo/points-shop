import Link from "next/link";
import type { Offering } from "@/lib/backend/types";
import { AddToCartButton } from "./AddToCartButton";

export function OfferingCard({ offering }: { offering: Offering }) {
  return (
    <article className="card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug">
          <Link href={`/services/${offering.slug}`} className="hover:underline">
            {offering.name}
          </Link>
        </h3>
        <span className="pill shrink-0 bg-accent-soft text-accent">{offering.pointsPrice} pts</span>
      </div>
      <p className="flex-1 text-sm text-muted">{offering.description}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted">{offering.deliveryPromise}</span>
        <AddToCartButton slug={offering.slug} />
      </div>
    </article>
  );
}
