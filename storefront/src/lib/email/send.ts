import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { getEnv } from "../env";
import type { EmailContent } from "./templates";

export type EmailKind = "magic-link" | "welcome" | "order-confirmed" | "owner-alert" | "visitor-message";

export interface OutgoingEmail extends EmailContent {
  kind: EmailKind;
  to: string;
  replyTo?: string;
}

export const LOCAL_EMAIL_DIR = path.join(process.cwd(), ".local-email");

/**
 * Sends through Resend when RESEND_API_KEY is set; otherwise writes the email as JSON to
 * .local-email/ for local development. Returns false on failure (best effort, design section 6).
 */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  const env = getEnv();
  try {
    if (!env.RESEND_API_KEY) {
      await mkdir(LOCAL_EMAIL_DIR, { recursive: true });
      const file = path.join(LOCAL_EMAIL_DIR, `${Date.now()}-${email.kind}.json`);
      await writeFile(file, JSON.stringify(email, null, 2), "utf8");
      console.info(`[email] ${email.kind} to ${email.to} written to ${file}`);
      return true;
    }
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(email.replyTo ? { replyTo: email.replyTo } : {}),
    });
    if (error) {
      console.error(`[email] Resend rejected ${email.kind}`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[email] ${email.kind} failed`, error);
    return false;
  }
}
