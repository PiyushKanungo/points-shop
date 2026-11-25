import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getBackend } from "../backend";
import { getEnv } from "../env";
import type { EmailContent } from "./templates";

export type EmailKind = "magic-link" | "welcome" | "order-confirmed" | "owner-alert" | "visitor-message";

export interface OutgoingEmail extends EmailContent {
  kind: EmailKind;
  to: string;
  replyTo?: string;
}

/** Where local emails go; LOCAL_EMAIL_DIR overrides it (each test file uses its own folder). */
export function localEmailDir(): string {
  return process.env.LOCAL_EMAIL_DIR || path.join(process.cwd(), ".local-email");
}

/**
 * Sends through Gmail when SMTP_USER and SMTP_PASS are set, else through Resend when RESEND_API_KEY is set, else through Salesforce on Vercel (or when
 * EMAIL_PROVIDER=salesforce); otherwise writes the email as JSON to
 * .local-email/ for local development. Returns false on failure (best effort, design section 6).
 */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  const env = getEnv();
  try {
    if (env.SMTP_USER && env.SMTP_PASS) {
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s/g, "") },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
      await transport.sendMail({
        from: { name: "Piyush's Points Shop", address: env.SMTP_USER },
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { replyTo: email.replyTo } : {}),
      });
      return true;
    }
    if (!env.RESEND_API_KEY && (env.VERCEL_ENV || env.EMAIL_PROVIDER === "salesforce")) {
      const toOwner = email.kind === "owner-alert" || email.kind === "visitor-message";
      await getBackend().sendEmail(toOwner ? null : email.to, email.subject, email.html);
      return true;
    }
    if (!env.RESEND_API_KEY) {
      const dir = localEmailDir();
      await mkdir(dir, { recursive: true });
      const file = path.join(dir, `${Date.now()}-${email.kind}.json`);
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
