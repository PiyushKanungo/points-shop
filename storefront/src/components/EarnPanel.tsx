"use client";

import Link from "next/link";
import { useState } from "react";
import type { Task } from "@/lib/backend/types";
import { useSession } from "./Header";
import { refreshShop } from "./refresh";

const FORM_LINKS: Record<string, string> = { feedback: "/feedback", "email-piyush": "/contact" };

export function EarnPanel({ tasks }: { tasks: Task[] }) {
  const session = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const signedIn = session?.signedIn ?? false;

  async function completeHonour(task: Task) {
    if (task.linkUrl) window.open(task.linkUrl, "_blank", "noopener");
    setBusy(task.key);
    const res = await fetch(`/api/tasks/${task.key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const body = await res.json().catch(() => null);
    setBusy(null);
    if (res.ok) {
      setMessage(body.pointsAwarded > 0 ? `+${body.pointsAwarded} points. Thank you!` : "Already counted.");
      refreshShop();
    } else {
      setMessage(body?.error?.message ?? "That didn't work. Try again.");
    }
  }

  function action(task: Task) {
    const done = (session?.taskCounts?.[task.key] ?? 0) >= task.maxPerWallet;
    if (done) return <span className="pill bg-good-soft text-good">Done</span>;
    if (task.key === "explore") return <span className="text-xs text-muted">Happens as you browse</span>;
    if (task.verification === "System") return <span className="text-xs text-muted">When you sign in</span>;
    if (task.verification === "Review") return <span className="text-xs text-muted">After a delivery</span>;
    if (task.verification === "Referral") {
      return signedIn ? (
        <Link href="/account" className="text-sm font-semibold text-accent underline">
          Get your link
        </Link>
      ) : (
        <span className="text-xs text-muted">Sign in for your link</span>
      );
    }
    if (!signedIn) {
      return (
        <Link href="/signin" className="text-sm font-semibold text-accent underline">
          Sign in to earn
        </Link>
      );
    }
    if (FORM_LINKS[task.key]) {
      return (
        <Link href={FORM_LINKS[task.key]} className="btn-ghost px-3 py-1.5">
          Write it
        </Link>
      );
    }
    return (
      <button
        type="button"
        className="btn-ghost px-3 py-1.5"
        onClick={() => completeHonour(task)}
        disabled={busy === task.key}
      >
        {busy === task.key ? "Saving…" : task.linkUrl ? "Open LinkedIn" : "Do it"}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="card divide-y divide-line">
        {tasks.map((task) => (
          <li key={task.key} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {task.name} <span className="text-accent">+{task.points}</span>
              </p>
              <p className="text-sm text-muted">{task.description}</p>
            </div>
            {action(task)}
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-good">
        {message}
      </p>
    </div>
  );
}
