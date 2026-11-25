import { NextResponse } from "next/server";
import { clearChat } from "@/lib/chat-cookie";
import { errorResponse } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/origin";
import { clearSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await clearSession();
    await clearChat();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
