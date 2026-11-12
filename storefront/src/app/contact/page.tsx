import type { Metadata } from "next";
import { Suspense } from "react";
import { MessageForm } from "@/components/MessageForm";
import { PageSkeleton } from "@/components/PageSkeleton";
import { requirePageSession } from "@/lib/page-session";

export const metadata: Metadata = { title: "Email Piyush" };

async function Form() {
  await requirePageSession("/contact");
  return (
    <MessageForm
      taskKey="email-piyush"
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
      label="Your message"
      placeholder="Hi Piyush, I'm learning SFCC and wondered…"
    />
  );
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Email Piyush</h1>
        <p className="text-muted">Say hello or ask something. I reply from my own inbox. Worth 40 points, once.</p>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <Form />
      </Suspense>
    </div>
  );
}
