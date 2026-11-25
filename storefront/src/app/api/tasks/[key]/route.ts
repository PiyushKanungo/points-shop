import { NextResponse } from "next/server";
import { z } from "zod";
import { assertHuman } from "@/lib/bot-check";
import { readJson, requireSession } from "@/lib/api";
import { getBackend } from "@/lib/backend";
import { sendEmail } from "@/lib/email/send";
import { visitorMessageEmail } from "@/lib/email/templates";
import { getEnv } from "@/lib/env";
import { errorResponse, ShopError } from "@/lib/errors";
import { assertSameOrigin } from "@/lib/origin";

const HONOUR_TASKS = new Set(["explore", "linkedin-post", "linkedin-hi"]);
const FORM_TASKS: Record<string, "feedback" | "contact"> = { feedback: "feedback", "email-piyush": "contact" };

const bodySchema = z.object({
  message: z.string().max(2000, "Keep it to 2,000 characters.").optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request, ctx: RouteContext<"/api/tasks/[key]">) {
  try {
    assertSameOrigin(request);
    const session = await requireSession();
    const { key } = await ctx.params;
    const body = await readJson(request, bodySchema);
    const backend = getBackend();
    const form = FORM_TASKS[key];
    await assertHuman(request, body.turnstileToken, Boolean(form));

    if (HONOUR_TASKS.has(key)) {
      return NextResponse.json(await backend.completeTask(session.walletId, key));
    }

    const kind = form;
    if (kind) {
      const message = body.message?.trim() ?? "";
      if (message.length < 10) throw new ShopError("VALIDATION", "Write at least 10 characters.");
      // Best effort: the message is also saved as evidence in Salesforce, so the task counts
      // even if this email fails.
      await sendEmail({
        kind: "visitor-message",
        to: getEnv().OWNER_EMAIL,
        replyTo: session.email,
        ...visitorMessageEmail(kind, session.email, message),
      });
      return NextResponse.json(await backend.completeTask(session.walletId, key, message));
    }

    throw new ShopError("VALIDATION", "This task can't be completed here.");
  } catch (error) {
    return errorResponse(error);
  }
}
