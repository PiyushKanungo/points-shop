"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { refreshShop } from "./refresh";

export function ReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rating, text: text.trim() || undefined }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error?.message ?? "That didn't save. Try again.");
      return;
    }
    setMessage(body.pointsAwarded > 0 ? `Thanks! +${body.pointsAwarded} points.` : "Thanks for the review!");
    refreshShop();
    router.refresh();
  }

  if (message) {
    return (
      <p role="status" className="font-semibold text-good">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <fieldset>
        <legend className="font-semibold">How was it? (+75 points)</legend>
        <div className="mt-2 flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={`grid h-10 w-10 place-items-center rounded-lg border text-xl peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-accent ${
                  value <= rating ? "border-accent bg-accent-soft text-accent" : "border-line bg-card text-muted"
                }`}
              >
                ★
              </span>
              <span className="sr-only">{value} out of 5</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="review-text" className="block text-sm font-semibold">
        A few words (optional)
      </label>
      <textarea
        id="review-text"
        maxLength={1000}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="field"
      />
      <button type="submit" className="btn-primary" disabled={busy || rating === 0}>
        {busy ? "Saving…" : "Send review"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </form>
  );
}
