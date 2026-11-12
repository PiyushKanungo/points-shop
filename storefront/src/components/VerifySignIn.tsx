"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { refreshShop } from "./refresh";

/**
 * The token arrives in the URL fragment (never sent to servers). Signing in waits for a click,
 * because email scanners open links automatically and would use up the single-use token.
 */
export function VerifySignIn() {
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const match = window.location.hash.match(/token=([\w.-]+)/);
    // Reading the fragment needs the browser, so this runs once after mount.
    // The updater keeps a token already read, since the hash is cleared below (effects can run twice).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken((previous) => previous ?? (match ? match[1] : null));
    if (match) history.replaceState(null, "", window.location.pathname);
  }, []);

  async function signIn() {
    if (!token) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      let next = "/";
      try {
        next = sessionStorage.getItem("ps_next") ?? "/";
        sessionStorage.removeItem("ps_next");
        localStorage.removeItem("ps_ref");
      } catch {
        // storage unavailable
      }
      refreshShop();
      router.push(next);
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => null);
    setError(body?.error?.message ?? "That link didn't work. Request a new one.");
    setBusy(false);
  }

  if (token === undefined) return <div className="card h-32 animate-pulse" />;

  if (token === null) {
    return (
      <div className="card space-y-3 p-6">
        <p>This page needs the link from your sign-in email.</p>
        <Link href="/signin" className="btn-primary">
          Get a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-6">
      <p className="text-muted">One more click and you&apos;re in.</p>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}{" "}
          <Link href="/signin" className="font-semibold underline">
            Get a new link
          </Link>
        </p>
      )}
      <button type="button" className="btn-primary w-full" onClick={signIn} disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </div>
  );
}
