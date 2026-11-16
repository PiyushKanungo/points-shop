import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getBackend } from "@/lib/backend";
import { getEnv } from "@/lib/env";
import { ShopError } from "@/lib/errors";

interface CalcomEvent {
  triggerEvent?: string;
  payload?: {
    uid?: string;
    startTime?: string;
    metadata?: { walletId?: string; orderId?: string };
  };
}

function validSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(signature.trim());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Cal.com BOOKING_CREATED webhook: saves the booking on the order named in the booking metadata.
 * Apex re-checks that the order belongs to that wallet. Problems with the booking itself are
 * answered 200 (no retry); outages are answered 503 so Cal.com retries (a repeat is a replay).
 */
export async function POST(request: Request) {
  const secret = getEnv().CALCOM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get("x-cal-signature-256"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let event: CalcomEvent;
  try {
    event = JSON.parse(rawBody) as CalcomEvent;
  } catch {
    return NextResponse.json({ ignored: "invalid JSON" });
  }
  if (event.triggerEvent !== "BOOKING_CREATED") {
    return NextResponse.json({ ignored: event.triggerEvent ?? "unknown event" });
  }

  const { uid, startTime, metadata } = event.payload ?? {};
  if (!uid || !startTime || !metadata?.walletId || !metadata?.orderId) {
    console.warn("[calcom] booking without Points Shop metadata", uid);
    return NextResponse.json({ ignored: "no order metadata" });
  }

  try {
    await getBackend().saveBooking(metadata.walletId, metadata.orderId, uid, startTime);
    return NextResponse.json({ saved: true });
  } catch (error) {
    if (error instanceof ShopError && (error.code === "UNAVAILABLE" || error.code === "INTERNAL")) {
      return NextResponse.json({ error: error.code }, { status: 503 });
    }
    console.warn("[calcom] booking not saved", uid, error instanceof ShopError ? error.code : error);
    return NextResponse.json({ ignored: error instanceof ShopError ? error.code : "error" });
  }
}
