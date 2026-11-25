"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "./Header";
import { refreshShop } from "./refresh";

interface Line {
  from: "visitor" | "agent" | "error";
  text: string;
}

const WELCOME = "Hi! I'm the concierge. Ask me about your points, how to earn more, or which offering fits you.";
const STARTERS = ["What's my balance?", "How can I earn more?", "What should I get?"];

export function ConciergePanel() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [lines, busy]);

  function close() {
    setOpen(false);
    toggle.current?.focus();
  }

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    const fresh = lines.length === 0;
    setLines((l) => [...l, { from: "visitor", text: trimmed }]);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, fresh }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        setLines((l) => [...l, { from: "agent", text: body.reply }]);
        if (body.orderPlaced) refreshShop();
      } else {
        setLines((l) => [...l, { from: "error", text: body?.error?.message ?? "That didn't work. Try again." }]);
      }
    } catch {
      setLines((l) => [...l, { from: "error", text: "I couldn't reach the shop. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3" onKeyDown={(e) => e.key === "Escape" && close()}>
      {open && (
        <section
          id="concierge"
          role="dialog"
          aria-label="Shop concierge"
          className="card flex h-[min(32rem,75dvh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-line bg-accent-soft px-4 py-3">
            <div>
              <p className="font-semibold">Concierge</p>
              <p className="text-xs text-muted">AI assistant, powered by Agentforce</p>
            </div>
            <button type="button" onClick={close} aria-label="Close concierge" className="rounded-md px-2 py-1 text-lg hover:bg-paper">
              ×
            </button>
          </header>
          <div ref={log} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            <p className="w-fit max-w-[85%] rounded-2xl bg-paper px-3 py-2">{WELCOME}</p>
            {lines.map((line, i) => (
              <p
                key={i}
                className={`w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 ${
                  line.from === "visitor" ? "ml-auto bg-accent text-accent-ink" : line.from === "agent" ? "bg-paper" : "bg-warn-soft"
                }`}
              >
                {line.text}
              </p>
            ))}
            {busy && <p className="w-fit animate-pulse rounded-2xl bg-paper px-3 py-2 text-muted">Thinking…</p>}
          </div>
          {session?.signedIn ? (
            <div className="space-y-2 border-t border-line p-3">
              {lines.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="btn-ghost px-2.5 py-1 text-xs">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(text);
                }}
              >
                <label htmlFor="concierge-message" className="sr-only">
                  Message
                </label>
                <input
                  id="concierge-message"
                  ref={input}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={500}
                  autoComplete="off"
                  className="field"
                  placeholder="Ask about points or offerings"
                />
                <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
                  Send
                </button>
              </form>
            </div>
          ) : (
            <div className="border-t border-line p-4 text-sm">
              <Link href="/signin" className="btn-primary w-full" onClick={() => setOpen(false)}>
                Sign in to chat
              </Link>
            </div>
          )}
        </section>
      )}
      <button
        ref={toggle}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="concierge"
        className="btn-primary rounded-full px-5 py-3 shadow-lg"
      >
        {open ? "Close chat" : "Ask the concierge"}
      </button>
    </div>
  );
}
