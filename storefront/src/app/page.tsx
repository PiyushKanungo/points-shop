import Link from "next/link";
import { EarnPanel } from "@/components/EarnPanel";
import { OfferingCard } from "@/components/OfferingCard";
import { RefCapture } from "@/components/RefCapture";
import { getCachedCatalog } from "@/lib/catalog";

export default async function HomePage() {
  const catalog = await getCachedCatalog();
  return (
    <div className="space-y-14">
      <RefCapture />
      <section className="grid gap-6 sm:grid-cols-[3fr_2fr] sm:items-end">
        <div className="space-y-4">
          <p className="pill bg-accent-soft text-accent">No money, just points</p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Real SFCC help from Piyush, paid for with a few friendly clicks.
          </h1>
          <p className="max-w-xl text-lg text-muted">
            I&apos;m a Salesforce B2C Commerce developer. Earn points by saying hi or leaving feedback, then spend them
            on a question answered, a resume review, a career chat or a mock interview. I deliver every one myself.
          </p>
        </div>
        <div className="card space-y-2 p-5 text-sm">
          <p className="font-semibold">How it works</p>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            <li>Sign in with your email: 50 points to start.</li>
            <li>Pick up a few more from the ways to earn.</li>
            <li>Check out with points; I&apos;ll take it from there.</li>
          </ol>
          <Link href="/how-its-built" className="inline-block pt-1 font-semibold text-accent underline">
            How it&apos;s built →
          </Link>
        </div>
      </section>

      <section aria-labelledby="offerings-heading" className="space-y-5">
        <h2 id="offerings-heading" className="text-2xl font-bold tracking-tight">
          What you can get
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {catalog.offerings.map((offering) => (
            <OfferingCard key={offering.slug} offering={offering} />
          ))}
        </div>
      </section>

      <section id="earn" aria-labelledby="earn-heading" className="space-y-5 scroll-mt-8">
        <div className="space-y-1">
          <h2 id="earn-heading" className="text-2xl font-bold tracking-tight">
            Ways to earn
          </h2>
          <p className="text-muted">Small, genuine things. Each one counts once.</p>
        </div>
        <EarnPanel tasks={catalog.tasks} />
      </section>
    </div>
  );
}
