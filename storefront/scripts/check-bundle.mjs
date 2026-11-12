// Goal 3: no Salesforce credentials, tokens or secrets in the JavaScript sent to browsers.
// Usage: node scripts/check-bundle.mjs --build   (builds with test secrets, then scans .next/static)
//        node scripts/check-bundle.mjs           (scans an existing build using the current env)
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const TEST_VALUES = {
  SHOP_BACKEND: "stub",
  SITE_URL: "http://localhost:3000",
  SESSION_SECRET: "bundlecheck-session-secret-7f3a9c2e1b8d4f60",
  MAGIC_LINK_SECRET: "bundlecheck-magic-secret-5e2b7d9a1c3f8e46",
  TURNSTILE_SECRET_KEY: "bundlecheck-turnstile-secret-4c8e2a6f",
  RESEND_API_KEY: "re_bundlecheck_9d1f3b5a7c",
  SF_CLIENT_SECRET: "bundlecheck-sf-client-secret-2a4c6e8f",
  SF_CLIENT_ID: "bundlecheck-sf-client-id-1b3d5f7a",
  SF_LOGIN_URL: "https://bundlecheck-org.my.salesforce.com",
  EMAIL_FROM: "Points Shop <shop@example.com>",
  OWNER_EMAIL: "owner@example.com",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
};

const SECRET_KEYS = ["SESSION_SECRET", "MAGIC_LINK_SECRET", "TURNSTILE_SECRET_KEY", "RESEND_API_KEY", "SF_CLIENT_SECRET"];
const TOKEN_PATTERN = /00D[A-Za-z0-9]{12,15}![A-Za-z0-9._]+/;

const env = process.argv.includes("--build") ? { ...process.env, ...TEST_VALUES } : process.env;
if (process.argv.includes("--build")) {
  // Stub backend at build time (no network); the secrets are present so any leak would show up.
  execSync("npx next build", { stdio: "inherit", env });
}

const needles = SECRET_KEYS.map((key) => [key, env[key]]).filter(([, value]) => value);
if (env.SF_LOGIN_URL) needles.push(["SF_LOGIN_URL host", new URL(env.SF_LOGIN_URL).host]);
if (needles.length === 0) {
  console.error("check-bundle: no secret values to search for. Run with --build or set the variables.");
  process.exit(1);
}

const root = path.join(process.cwd(), ".next", "static");
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(full);
  }
})(root);

const problems = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const [label, value] of needles) {
    if (text.includes(value)) problems.push(`${label} found in ${path.relative(process.cwd(), file)}`);
  }
  if (TOKEN_PATTERN.test(text)) problems.push(`Salesforce access token pattern found in ${path.relative(process.cwd(), file)}`);
}

if (problems.length > 0) {
  console.error("check-bundle: FAILED\n" + problems.join("\n"));
  process.exit(1);
}
console.log(`check-bundle: OK (${files.length} files, ${needles.length} values and the token pattern checked)`);
