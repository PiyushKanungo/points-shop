import "server-only";
import { z } from "zod";

const schema = z
  .object({
    SHOP_BACKEND: z.enum(["stub", "salesforce"]).default("stub"),
    SITE_URL: z.url(),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
    MAGIC_LINK_SECRET: z.string().min(32, "MAGIC_LINK_SECRET must be at least 32 characters"),
    EMAIL_FROM: z.string().min(3),
    OWNER_EMAIL: z.email(),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().default(""),
    TURNSTILE_SECRET_KEY: z.string().default(""),
    SF_LOGIN_URL: z.url().optional(),
    SF_CLIENT_ID: z.string().optional(),
    SF_CLIENT_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    BMAC_URL: z.url().optional(),
    GITHUB_URL: z.url().optional(),
    LINKEDIN_URL: z.url().optional(),
    /** Gmail address and app password: the preferred sender when set. */
    SMTP_USER: z.email().optional(),
    SMTP_PASS: z.string().optional(),
    /** "salesforce" sends email through the org locally too; on Vercel it is the default without Resend. */
    EMAIL_PROVIDER: z.enum(["salesforce"]).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    CALCOM_WEBHOOK_SECRET: z.string().optional(),
    STUB_FAIL: z.enum(["catalog", "all"]).optional(),
    VERCEL_ENV: z.string().optional(),
    VERCEL_BRANCH_URL: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.SHOP_BACKEND === "salesforce") {
      for (const key of ["SF_LOGIN_URL", "SF_CLIENT_ID", "SF_CLIENT_SECRET"] as const) {
        if (!env[key]) {
          ctx.addIssue({ code: "custom", path: [key], message: `${key} is required for the salesforce backend` });
        }
      }
    }
    if (env.VERCEL_ENV && !env.RESEND_API_KEY && env.SHOP_BACKEND !== "salesforce") {
      // Vercel's filesystem is read-only, so the local email log cannot work there.
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "RESEND_API_KEY is required on Vercel" });
    }
    if (env.SHOP_BACKEND === "stub" && env.VERCEL_ENV === "production") {
      ctx.addIssue({ code: "custom", path: ["SHOP_BACKEND"], message: "The stub backend cannot run in production" });
    }
  });

export type Env = z.infer<typeof schema> & { siteUrl: string };

let cached: Env | undefined;

/**
 * Parses the environment on first use. Empty strings count as unset.
 * On Vercel preview deployments the site URL is the branch URL, so links and the
 * Origin check work on the stable branch alias.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const raw: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    raw[key] = value === "" ? undefined : value;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${problems}`);
  }
  const env = result.data;
  const siteUrl =
    env.VERCEL_ENV === "preview" && env.VERCEL_BRANCH_URL
      ? `https://${env.VERCEL_BRANCH_URL}`
      : env.SITE_URL;
  cached = { ...env, siteUrl: siteUrl.replace(/\/$/, "") };
  return cached;
}

/** For tests only. */
export function resetEnvForTests() {
  cached = undefined;
}
