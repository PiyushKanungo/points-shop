import { NextResponse } from "next/server";
import { z } from "zod";
import { assertHuman, limitSignInEmails } from "@/lib/bot-check";
import { EMAIL_PATTERN, readJson } from "@/lib/api";
import { sendEmail } from "@/lib/email/send";
import { magicLinkEmail } from "@/lib/email/templates";
import { errorResponse, ShopError } from "@/lib/errors";
import { createToken, linkFor } from "@/lib/magic-link";
import { assertSameOrigin } from "@/lib/origin";

const bodySchema = z.object({
  email: z.string().max(254),
  ref: z.string().max(20).optional(),
  turnstileToken: z.string().optional(),
});

/** Sends a magic link. Writes nothing to Salesforce (design section 5). */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request, bodySchema);
    await assertHuman(request, body.turnstileToken);
    const email = body.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) throw new ShopError("VALIDATION", "Enter a valid email address.");

    await limitSignInEmails(request, email);

    const content = magicLinkEmail(linkFor(createToken(email, body.ref?.trim() || undefined)));
    const sent = await sendEmail({ kind: "magic-link", to: email, ...content });
    if (!sent) throw new ShopError("UNAVAILABLE", "We couldn't send the email. Try again in a few minutes.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
