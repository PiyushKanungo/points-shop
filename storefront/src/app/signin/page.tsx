import type { Metadata } from "next";
import { SignInForm } from "@/components/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="text-muted">
          No password. Enter your email and I&apos;ll send you a link. New here? You get 50 points the first time.
        </p>
      </div>
      <SignInForm siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />
    </div>
  );
}
