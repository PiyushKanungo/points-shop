import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "../env";
import { resetTokenForTests, salesforceBackend } from "./salesforce";

const TOKEN_URL = "https://example.my.salesforce.com/services/oauth2/token";

function tokenResponse(n = 1) {
  return Response.json({ access_token: `token-${n}`, instance_url: "https://example.my.salesforce.com" });
}

describe("salesforce backend", () => {
  let calls: Array<{ url: string; init?: RequestInit }>;

  beforeEach(() => {
    process.env.SHOP_BACKEND = "salesforce";
    process.env.SF_LOGIN_URL = "https://example.my.salesforce.com";
    process.env.SF_CLIENT_ID = "id";
    process.env.SF_CLIENT_SECRET = "secret";
    resetEnvForTests();
    resetTokenForTests();
    calls = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.SHOP_BACKEND = "stub";
    resetEnvForTests();
  });

  function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return handler(url, init);
      }),
    );
  }

  it("caches the token and sends checkout with the offerings key", async () => {
    mockFetch((url) => (url === TOKEN_URL ? tokenResponse() : Response.json({ orders: [], replay: false, balance: 0 })));
    await salesforceBackend.checkout("w1", "key-12345678", ["career-chat"]);
    await salesforceBackend.checkout("w1", "key-12345678", ["career-chat"]);
    expect(calls.filter((c) => c.url === TOKEN_URL)).toHaveLength(1);
    const apiCall = calls.find((c) => c.url.endsWith("/services/apexrest/shop/v1/wallets/w1/checkout"));
    expect(JSON.parse(String(apiCall?.init?.body))).toEqual({ checkoutKey: "key-12345678", offerings: ["career-chat"] });
    expect((apiCall?.init?.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
  });

  it("refreshes the token once on INVALID_SESSION_ID", async () => {
    let tokens = 0;
    let apiCalls = 0;
    mockFetch((url) => {
      if (url === TOKEN_URL) return tokenResponse(++tokens);
      apiCalls++;
      return apiCalls === 1
        ? Response.json([{ errorCode: "INVALID_SESSION_ID", message: "Session expired" }], { status: 401 })
        : Response.json({ wallet: { id: "w1", balance: 5 } });
    });
    const wallet = await salesforceBackend.getWallet("w1");
    expect(wallet.balance).toBe(5);
    expect(tokens).toBe(2);
  });

  it("does not refresh the token for a business 401", async () => {
    let tokens = 0;
    mockFetch((url) =>
      url === TOKEN_URL
        ? tokenResponse(++tokens)
        : Response.json({ error: { code: "UNAUTHORIZED", message: "Link used" } }, { status: 401 }),
    );
    await expect(salesforceBackend.verifySignIn("a@example.com", 1)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Link used",
    });
    expect(tokens).toBe(1);
  });

  it("maps errors in the documented order", async () => {
    const cases: Array<[Response | Error, string]> = [
      [Response.json({ error: { code: "INSUFFICIENT_POINTS", message: "Not enough" } }, { status: 409 }), "INSUFFICIENT_POINTS"],
      [Response.json({ error: { code: "INTERNAL", message: "x" } }, { status: 500 }), "UNAVAILABLE"],
      [Response.json([{ errorCode: "REQUEST_LIMIT_EXCEEDED" }], { status: 403 }), "UNAVAILABLE"],
      [Response.json([{ errorCode: "APEX_ERROR" }], { status: 500 }), "UNAVAILABLE"],
      [Response.json([{ errorCode: "NOT_FOUND" }], { status: 404 }), "INTERNAL"],
      [new Response("bad gateway", { status: 502 }), "UNAVAILABLE"],
      [new Error("timeout"), "UNAVAILABLE"],
    ];
    for (const [result, code] of cases) {
      resetTokenForTests();
      mockFetch((url) => {
        if (url === TOKEN_URL) return tokenResponse();
        if (result instanceof Error) throw result;
        return result.clone();
      });
      await expect(salesforceBackend.getCatalog()).rejects.toMatchObject({ code });
    }
  });

  it("maps token endpoint failures to UNAVAILABLE", async () => {
    mockFetch(() => Response.json({ error: "invalid_client", error_description: "bad" }, { status: 400 }));
    await expect(salesforceBackend.getCatalog()).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});
