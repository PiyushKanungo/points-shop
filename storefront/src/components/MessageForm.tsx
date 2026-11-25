"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import Link from "next/link";
import { useState } from "react";
import { isRealTurnstileKey } from "@/lib/turnstile-key";
import { refreshShop } from "./refresh";

export function MessageForm({
  taskKey,
  siteKey,
  label,
  placeholder,
}: {
  taskKey: "feedback" | "email-piyush";
  siteKey: string;
  label: string;
  placeholder: string;
}) {
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(isRealTurnstileKey(siteKey) ? null : "not-configured");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("busy");
    setError(null);
    const res = await fetch(`/api/tasks/${taskKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, turnstileToken: token }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setResult(body.pointsAwarded > 0 ? `Sent. +${body.pointsAwarded} points, thank you!` : "Sent. Thank you!");
      setState("sent");
      refreshShop();
      return;
    }
    if (res.status === 401) {
      setError("Sign in first, then send it.");
    } else {
      setError(body?.error?.message ?? "That didn't send. Try again.");
    }
    setState("idle");
  }

  if (state === "sent") {
    return (
      <div role="status" className="card space-y-3 p-6">
        <p className="text-lg font-semibold">{result}</p>
        <Link href="/" className="btn-ghost">
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-semibold">
          {label}
        </label>
        <textarea
          id="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="field"
          placeholder={placeholder}
        />
        <p className="text-xs text-muted">{message.length}/2000</p>
      </div>
      {isRealTurnstileKey(siteKey) && (
        <Turnstile siteKey={siteKey} onSuccess={setToken} onExpire={() => setToken(null)} options={{ size: "flexible" }} />
      )}
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={state === "busy" || !token || message.trim().length < 10}>
        {state === "busy" ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
