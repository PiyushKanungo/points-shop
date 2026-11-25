"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { refreshShop, useShopRefresh } from "./refresh";

export interface SessionInfo {
  signedIn: boolean;
  email?: string;
  balance?: number | null;
  taskCounts?: Record<string, number>;
  cartCount: number;
}

async function fetchSession(): Promise<SessionInfo | null> {
  try {
    const res = await fetch("/api/session", { cache: "no-store" });
    return res.ok ? ((await res.json()) as SessionInfo) : null;
  } catch {
    return null; // Header stays in its loading state; pages show their own errors.
  }
}

export function useSession(): SessionInfo | null {
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const load = useCallback(() => {
    void fetchSession().then((next) => {
      if (next) setInfo(next);
    });
  }, []);
  useEffect(() => {
    fetchSession().then((next) => {
      if (next) setInfo(next);
    });
  }, []);
  useShopRefresh(load);
  return info;
}

export function Header() {
  const info = useSession();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    refreshShop();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm text-accent-ink">
            P
          </span>
          Piyush&apos;s Points Shop
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1 text-sm sm:gap-2">
          <Link href="/how-its-built" className="rounded-md px-2 py-1.5 hover:bg-paper">
            How it&apos;s built
          </Link>
          {info?.signedIn && (
            <>
              <Link href="/orders" className="rounded-md px-2 py-1.5 hover:bg-paper">
                Orders
              </Link>
              <Link href="/account" className="rounded-md px-2 py-1.5 hover:bg-paper">
                Account
              </Link>
            </>
          )}
          <Link href="/cart" className="rounded-md px-2 py-1.5 hover:bg-paper">
            Cart{info && info.cartCount > 0 ? ` (${info.cartCount})` : ""}
          </Link>
          {info?.signedIn ? (
            <>
              <span className="pill bg-accent-soft text-accent" aria-label="Your points balance">
                {typeof info.balance === "number" ? `${info.balance} pts` : "– pts"}
              </span>
              <button type="button" onClick={signOut} className="rounded-md px-2 py-1.5 text-muted hover:bg-paper">
                Sign out
              </button>
            </>
          ) : (
            info && (
              <Link href="/signin" className="btn-primary px-3 py-1.5">
                Sign in
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
