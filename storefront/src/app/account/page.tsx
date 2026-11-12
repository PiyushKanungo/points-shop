import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CopyField } from "@/components/CopyField";
import { ErrorNotice } from "@/components/ErrorNotice";
import { PageSkeleton } from "@/components/PageSkeleton";
import { getBackend } from "@/lib/backend";
import type { Wallet } from "@/lib/backend/types";
import { getEnv } from "@/lib/env";
import { ShopError } from "@/lib/errors";
import { requirePageSession } from "@/lib/page-session";

export const metadata: Metadata = { title: "Your account" };

async function Account() {
  const session = await requirePageSession("/account");
  let wallet: Wallet;
  try {
    wallet = await getBackend().getWallet(session.walletId);
  } catch (error) {
    if (error instanceof ShopError && error.code === "NOT_FOUND") redirect("/signin?reason=expired");
    return <ErrorNotice error={error} />;
  }
  const referralLink = `${getEnv().siteUrl}/?ref=${wallet.referralCode}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="break-all font-medium">{wallet.email}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Balance</p>
          <p className="text-3xl font-bold text-accent">{wallet.balance} pts</p>
        </div>
      </div>
      <div className="card space-y-2 p-5">
        <h2 className="font-semibold">Your referral link</h2>
        <p className="text-sm text-muted">When a friend signs up with it, you get 100 points (up to 5 friends).</p>
        <CopyField value={referralLink} label="Referral link" />
      </div>
      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Points history</h2>
        {wallet.recentEntries.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {wallet.recentEntries.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-3 py-2">
                <span>{entry.reason ?? entry.entryType}</span>
                <span className={entry.amount > 0 ? "font-semibold text-good" : "font-semibold"}>
                  {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Your account</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Account />
      </Suspense>
    </div>
  );
}
