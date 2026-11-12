"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Offering } from "@/lib/backend/types";
import { refreshShop } from "./refresh";

export function CartView({ initialLines, balance }: { initialLines: Offering[]; balance: number }) {
  const router = useRouter();
  const [lines, setLines] = useState(initialLines);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = lines.reduce((sum, o) => sum + o.pointsPrice, 0);
  const missing = Math.max(0, total - balance);

  async function remove(slug: string) {
    const res = await fetch("/api/cart", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (res.ok) {
      setLines((current) => current.filter((o) => o.slug !== slug));
      refreshShop();
    }
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/checkout", { method: "POST" });
    if (res.ok) {
      refreshShop();
      router.push("/orders?placed=1");
      return;
    }
    const body = await res.json().catch(() => null);
    setError(body?.error?.message ?? "Checkout didn't go through. Try again.");
    setBusy(false);
  }

  if (lines.length === 0) {
    return (
      <div className="card space-y-3 p-6">
        <p>Your cart is empty.</p>
        <Link href="/" className="btn-primary">
          Browse offerings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="card divide-y divide-line">
        {lines.map((o) => (
          <li key={o.slug} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{o.name}</p>
              <p className="text-sm text-muted">{o.deliveryPromise}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">{o.pointsPrice} pts</span>
              <button type="button" className="text-sm text-muted underline" onClick={() => remove(o.slug)}>
                Remove<span className="sr-only"> {o.name}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted">Total</dt>
          <dd className="font-semibold">{total} pts</dd>
          <dt className="text-muted">Your balance</dt>
          <dd className="font-semibold">{balance} pts</dd>
        </dl>
        <div className="flex flex-col items-end gap-2">
          <button type="button" className="btn-primary" onClick={checkout} disabled={busy || missing > 0}>
            {busy ? "Placing order…" : "Check out with points"}
          </button>
          {missing > 0 && (
            <p className="text-sm text-muted">
              You need {missing} more points.{" "}
              <Link href="/#earn" className="font-semibold text-accent underline">
                Ways to earn
              </Link>
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-accent">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
