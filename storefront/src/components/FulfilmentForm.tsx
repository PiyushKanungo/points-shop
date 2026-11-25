"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FulfilmentType } from "@/lib/backend/types";
import { MAX_PRIVATE_RESUME_BYTES } from "@/lib/resume-url";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

async function saveDetails(orderId: string, body: object): Promise<string | null> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/details`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.error?.message ?? "That didn't save. Try again.";
}

export function FulfilmentForm({
  orderId,
  fulfilmentType,
  bookingLink,
  privateResume,
}: {
  orderId: string;
  fulfilmentType: FulfilmentType;
  bookingLink: string | null;
  /** True when resumes are stored as private Salesforce files instead of in Vercel Blob. */
  privateResume: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [slot, setSlot] = useState("");
  const maxBytes = privateResume ? MAX_PRIVATE_RESUME_BYTES : MAX_RESUME_BYTES;
  const maxLabel = privateResume ? "2 MB" : "5 MB";
  const [file, setFile] = useState<File | null>(null);

  async function submitQuestion(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const problem = await saveDetails(orderId, { question });
    setBusy(false);
    if (problem) setError(problem);
    else router.refresh();
  }

  async function submitResume(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    if (file.type !== "application/pdf") return setError("Please choose a PDF file.");
    if (file.size > maxBytes) return setError(`The PDF must be ${maxLabel} or smaller.`);
    setBusy(true);
    setError(null);
    try {
      if (privateResume) {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/resume`, {
          method: "POST",
          headers: { "content-type": "application/pdf" },
          body: file,
        });
        const data = await res.json().catch(() => null);
        if (res.ok) router.refresh();
        else setError(data?.error?.message ?? "The upload didn't work. Try again.");
        return;
      }
      const blob = await upload(`resumes/${encodeURIComponent(orderId)}/resume.pdf`, file, {
        access: "public",
        handleUploadUrl: "/api/resume-upload",
        clientPayload: JSON.stringify({ orderId }),
        contentType: "application/pdf",
      });
      const problem = await saveDetails(orderId, { resumeUrl: blob.url });
      if (problem) setError(problem);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The upload didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitBooking(event: React.FormEvent) {
    event.preventDefault();
    const start = new Date(slot);
    if (Number.isNaN(start.getTime())) return setError("Pick a date and time.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/booking`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ start: start.toISOString() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) router.refresh();
      else setError(data?.error?.message ?? "That didn't save. Try again.");
    } catch {
      setError("That didn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (fulfilmentType === "Question") {
    return (
      <form onSubmit={submitQuestion} className="space-y-3">
        <label htmlFor="question" className="block font-semibold">
          Your question
        </label>
        <textarea
          id="question"
          required
          minLength={20}
          maxLength={2000}
          rows={7}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="field"
          placeholder="Context helps: which SFCC setup (SFRA, PWA Kit, Storefront Next), what you tried, what happened."
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted">{question.length}/2000</span>
          <button type="submit" className="btn-primary" disabled={busy || question.trim().length < 20}>
            {busy ? "Sending…" : "Send question"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        )}
      </form>
    );
  }

  if (fulfilmentType === "Resume") {
    return (
      <form onSubmit={submitResume} className="space-y-3">
        <label htmlFor="resume" className="block font-semibold">
          Your resume (PDF, up to {maxLabel})
        </label>
        <input
          id="resume"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="field file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:font-semibold file:text-accent"
        />
        <button type="submit" className="btn-primary" disabled={busy || !file}>
          {busy ? "Uploading…" : "Upload resume"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        )}
      </form>
    );
  }

  if (bookingLink) {
    return (
      <div className="space-y-3">
        <p className="font-semibold">Pick a time</p>
        <a href={bookingLink} target="_blank" rel="noopener" className="btn-primary">
          Choose a slot on Cal.com
        </a>
        <p className="text-sm text-muted">
          Once you book, this order moves to In Progress (refresh this page in a minute).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submitBooking} className="space-y-3">
      <label htmlFor="slot" className="block font-semibold">
        Pick a time (your local time)
      </label>
      <input id="slot" type="datetime-local" required step={900} value={slot} onChange={(e) => setSlot(e.target.value)} className="field" />
      <p className="text-sm text-muted">At least a day ahead, up to 60 days. Piyush confirms by email with the video link.</p>
      <button type="submit" className="btn-primary" disabled={busy || !slot}>
        {busy ? "Sending…" : "Request this time"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </form>
  );
}
