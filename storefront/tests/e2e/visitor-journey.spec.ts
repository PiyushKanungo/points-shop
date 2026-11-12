import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const EMAIL_DIR = path.join(process.cwd(), ".local-email");

async function latestMagicLink(to: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const files = (await readdir(EMAIL_DIR).catch(() => [])).filter((f) => f.endsWith("-magic-link.json")).sort().reverse();
    for (const file of files) {
      const email = JSON.parse(await readFile(path.join(EMAIL_DIR, file), "utf8"));
      if (email.to === to) return email.text.match(/(http\S+#token=[\w.-]+)/)[1];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No magic link for ${to}`);
}

test("a visitor signs in, earns 100 points and orders an SFCC answer", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  // Cloudflare's test site key passes automatically once the widget loads.
  const submit = page.getByRole("button", { name: "Email me a sign-in link" });
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await submit.click();
  await expect(page.getByText("Check your inbox")).toBeVisible();

  await page.goto(await latestMagicLink(email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByLabel("Your points balance")).toHaveText("50 pts");

  // Explore: three pages including How it's built.
  await page.goto("/services/career-chat");
  await page.goto("/cart");
  await page.goto("/how-its-built");
  await expect(page.getByLabel("Your points balance")).toHaveText("80 pts");

  // LinkedIn honour task (the LinkedIn tab it opens is closed).
  await page.goto("/");
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Read and react to a LinkedIn post" })
    .getByRole("button", { name: "Open LinkedIn" })
    .click();
  await (await popup).close();
  await expect(page.getByLabel("Your points balance")).toHaveText("100 pts");

  await page
    .getByRole("article")
    .filter({ hasText: "Ask an SFCC developer" })
    .getByRole("button", { name: "Add to cart" })
    .click();
  await page.getByRole("link", { name: /In your cart/ }).click();
  await page.getByRole("button", { name: "Check out with points" }).click();

  await expect(page).toHaveURL(/\/orders\?placed=1/);
  await expect(page.getByText("Order placed.")).toBeVisible();
  await expect(page.getByText("Awaiting Details")).toBeVisible();
  await expect(page.getByLabel("Your points balance")).toHaveText("0 pts");
});
