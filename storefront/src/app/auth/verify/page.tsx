import type { Metadata } from "next";
import { VerifySignIn } from "@/components/VerifySignIn";

export const metadata: Metadata = { title: "Finish signing in", referrer: "no-referrer" };

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Finish signing in</h1>
      <VerifySignIn />
    </div>
  );
}
