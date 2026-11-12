import type { Metadata } from "next";
import { Suspense } from "react";
import { MessageForm } from "@/components/MessageForm";
import { PageSkeleton } from "@/components/PageSkeleton";
import { requirePageSession } from "@/lib/page-session";

export const metadata: Metadata = { title: "Give feedback" };

async function Form() {
  await requirePageSession("/feedback");
  return (
    <MessageForm
      taskKey="feedback"
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
      label="What works, what doesn't?"
      placeholder="The cart was clear, but I wasn't sure what happens after I order…"
    />
  );
}

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Give feedback</h1>
        <p className="text-muted">Honest notes on the site help me most. Worth 50 points, once.</p>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <Form />
      </Suspense>
    </div>
  );
}
