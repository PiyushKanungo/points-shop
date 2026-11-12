import { describe, expect, it } from "vitest";

/**
 * Checks the real Apex REST API's response shapes. Run with:
 *   SMOKE=1 SF_LOGIN_URL=... SF_CLIENT_ID=... SF_CLIENT_SECRET=... npm run test:smoke
 * Creates one wallet with a +smoke- address (delete it later with scripts/apex/delete-wallet.apex).
 */
const enabled = process.env.SMOKE === "1";

describe.skipIf(!enabled)("Salesforce API smoke test", () => {
  it("returns the shapes the storefront expects", async () => {
    Object.assign(process.env, {
      SHOP_BACKEND: "salesforce",
      SITE_URL: "http://localhost:3000",
      SESSION_SECRET: "smoke-session-secret-0123456789-abcdefghij",
      MAGIC_LINK_SECRET: "smoke-magic-link-secret-0123456789-abcdef",
      EMAIL_FROM: "smoke@example.com",
      OWNER_EMAIL: "smoke@example.com",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "x",
      TURNSTILE_SECRET_KEY: "x",
    });
    const { salesforceBackend: api } = await import("./salesforce");

    const catalog = await api.getCatalog();
    expect(catalog.offerings.length).toBeGreaterThan(0);
    expect(catalog.offerings[0]).toEqual(
      expect.objectContaining({ slug: expect.any(String), pointsPrice: expect.any(Number), fulfilmentType: expect.any(String) }),
    );
    expect(catalog.tasks[0]).toEqual(expect.objectContaining({ key: expect.any(String), maxPerWallet: expect.any(Number) }));

    const email = `piyush+smoke-${crypto.randomUUID()}@example.com`;
    const { wallet, isNew } = await api.verifySignIn(email, Date.now());
    expect(isNew).toBe(true);
    expect(wallet).toEqual(expect.objectContaining({ id: expect.any(String), balance: 50, referralCode: expect.any(String) }));
    expect(wallet.taskCounts.signup).toBe(1);

    const task = await api.completeTask(wallet.id, "explore");
    expect(task).toEqual({ pointsAwarded: 30, replay: false, balance: 80 });

    const again = await api.getWallet(wallet.id);
    expect(again.recentEntries[0]).toEqual(expect.objectContaining({ amount: expect.any(Number), entryType: expect.any(String) }));

    expect(await api.listOrders(wallet.id)).toEqual([]);
    await expect(api.checkout(wallet.id, crypto.randomUUID(), ["mock-interview"])).rejects.toMatchObject({
      code: "INSUFFICIENT_POINTS",
    });
  });
});
