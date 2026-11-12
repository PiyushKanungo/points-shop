import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { getCachedCatalog } from "@/lib/catalog";

export async function generateStaticParams() {
  const catalog = await getCachedCatalog();
  return catalog.offerings.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const offering = (await getCachedCatalog()).offerings.find((o) => o.slug === slug);
  return { title: offering?.name ?? "Offering" };
}

async function OfferingDetails({ params }: Pick<PageProps<"/services/[slug]">, "params">) {
  const { slug } = await params;
  const offering = (await getCachedCatalog()).offerings.find((o) => o.slug === slug);
  if (!offering) notFound();

  return (
    <article className="card space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{offering.name}</h1>
        <span className="pill bg-accent-soft text-base text-accent">{offering.pointsPrice} pts</span>
      </div>
      <p className="text-lg text-muted">{offering.description}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">Delivery</dt>
          <dd className="text-muted">{offering.deliveryPromise}</dd>
        </div>
        <div>
          <dt className="font-semibold">What happens after you order</dt>
          <dd className="text-muted">
            {offering.fulfilmentType === "Question" && "You type your question on the order page."}
            {offering.fulfilmentType === "Resume" && "You upload your resume as a PDF on the order page."}
            {offering.fulfilmentType === "Booking" && "You pick a time slot from the order page."}
          </dd>
        </div>
      </dl>
      <AddToCartButton slug={offering.slug} />
    </article>
  );
}

export default function OfferingPage(props: PageProps<"/services/[slug]">) {
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-muted underline">
        ← All offerings
      </Link>
      <Suspense fallback={<div className="card h-64 animate-pulse" />}>
        <OfferingDetails params={props.params} />
      </Suspense>
    </div>
  );
}
