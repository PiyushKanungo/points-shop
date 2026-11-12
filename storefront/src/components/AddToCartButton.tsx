"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { refreshShop } from "./refresh";

export function AddToCartButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "added">("idle");
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setState("busy");
    setError(null);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (res.status === 401) {
      router.push(`/signin?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Couldn't add that. Try again.");
      setState("idle");
      return;
    }
    setState("added");
    refreshShop();
  }

  if (state === "added") {
    return (
      <a href="/cart" className="btn-ghost">
        In your cart → view
      </a>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button type="button" className="btn-primary" onClick={add} disabled={state === "busy"}>
        {state === "busy" ? "Adding…" : "Add to cart"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-accent">
          {error}
        </span>
      )}
    </span>
  );
}
