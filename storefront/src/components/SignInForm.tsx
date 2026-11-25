"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useEffect, useState } from "react";
import { isRealTurnstileKey } from "@/lib/turnstile-key";

export function SignInForm({ siteKey }: { siteKey: string }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(isRealTurnstileKey(siteKey) ? null : "not-configured");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    try {
      if (next && next.startsWith("/") && !next.startsWith("//")) sessionStorage.setItem("ps_next", next);
    } catch {
      // storage unavailable
    }
    // The query string is only readable in the browser, so this runs once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get("reason") === "expired") setNotice("Please sign in again.");
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("busy");
    setError(null);
    let ref: string | undefined;
    try {
      ref = localStorage.getItem("ps_ref") ?? undefined;
    } catch {
      ref = undefined;
    }
    const res = await fetch("/api/auth/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, ref, turnstileToken: token }),
    });
    if (res.ok) {
      setState("sent");
      return;
    }
    const body = await res.json().catch(() => null);
    setError(body?.error?.message ?? "That didn't work. Try again.");
    setState("idle");
  }

  if (state === "sent") {
    return (
      <div role="status" className="card space-y-2 p-6">
        <p className="text-lg font-semibold">Check your inbox</p>
        <p className="text-muted">
          I sent a sign-in link to <strong className="text-ink">{email}</strong>. It works once and expires in 15
          minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      {notice && <p className="text-sm text-muted">{notice}</p>}
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          placeholder="you@example.com"
        />
      </div>
      {isRealTurnstileKey(siteKey) && (
        <Turnstile siteKey={siteKey} onSuccess={setToken} onExpire={() => setToken(null)} options={{ size: "flexible" }} />
      )}
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={state === "busy" || !token}>
        {state === "busy" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
