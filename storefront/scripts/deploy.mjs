// Run by the owner: copies settings from .env.local to the Vercel project and deploys to production.
// Usage: node scripts/deploy.mjs [site-url]
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const siteUrl = (process.argv[2] ?? "https://points-shop.vercel.app").replace(/\/$/, "");
const local = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim().replace(/^(["'])(.*)\1$/, "$2")];
    }),
);

function vercel(args, input) {
  const result = spawnSync(`vercel ${args}`, {
    shell: true,
    encoding: "utf8",
    input,
    stdio: input === undefined ? "inherit" : ["pipe", "ignore", "pipe"],
  });
  if (result.status !== 0) {
    console.error(`vercel ${args} failed`, result.stderr ?? "");
    process.exit(1);
  }
}


if (!existsSync(".vercel/project.json")) vercel("link --yes --project points-shop");

const values = {
  SHOP_BACKEND: "salesforce",
  SITE_URL: siteUrl,
  SESSION_SECRET: randomBytes(32).toString("hex"),
  MAGIC_LINK_SECRET: randomBytes(32).toString("hex"),
};
for (const key of ["SMTP_USER", "SMTP_PASS", "RESEND_API_KEY", "OWNER_EMAIL", "EMAIL_FROM", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "SF_LOGIN_URL",
  "SF_CLIENT_ID", "SF_CLIENT_SECRET", "GITHUB_URL", "LINKEDIN_URL", "BMAC_URL"]) {
  if (local[key]) values[key] = local[key];
}
for (const [key, value] of Object.entries(values)) {
  vercel(`env add ${key} production --force`, value);
  console.log(`set ${key}`);
}
vercel("deploy --prod --yes");
const response = await fetch(siteUrl).catch(() => undefined);
console.log(response?.ok ? `Live: ${siteUrl}` : `${siteUrl} did not answer (${response?.status}). Send Claude the Production URL above.`);
