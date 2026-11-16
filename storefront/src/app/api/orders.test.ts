import { createHmac } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
}));

const { POST: link } = await import("./auth/link/route");
const { POST: verify } = await import("./auth/verify/route");
const { POST: addToCart } = await import("./cart/route");
const { POST: checkout } = await import("./checkout/route");
const { POST: details } = await import("./orders/[id]/details/route");
const { POST: review } = await import("./orders/[id]/review/route");
const { POST: calcom } = await import("./webhooks/calcom/route");
const { deliverForTests, resetStubForTests, stubBackend } = await import("@/lib/backend/stub");
process.env.LOCAL_EMAIL_DIR = path.join(process.cwd(), ".local-email", "test-orders");
const LOCAL_EMAIL_DIR = process.env.LOCAL_EMAIL_DIR;
const { resetEnvForTests } = await import("@/lib/env");
const { readSessionToken, SESSION_COOKIE } = await import("@/lib/session");

const ORIGIN = "http://localhost:3100";
const SECRET = "test-calcom-secret";

function post(url: string, body?: unknown) {
  return new Request(`${ORIGIN}${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const idParams = (id: string) => ({ params: Promise.resolve({ id }) }) as never;

async function signInAndBuy(email: string, slug: string, startingPoints = 1000) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })));
  await link(post("/api/auth/link", { email, turnstileToken: "t" }));
  const files = (await readdir(LOCAL_EMAIL_DIR)).filter((f) => f.endsWith("-magic-link.json")).sort();
  const text = JSON.parse(await readFile(path.join(LOCAL_EMAIL_DIR, files.at(-1)!), "utf8")).text;
  await verify(post("/api/auth/verify", { token: text.match(/#token=([\w.-]+)/)[1] }));
  const session = await readSessionToken(jar.get(SESSION_COOKIE));
  // Top up the stub wallet so any offering can be bought (the stub keeps state on globalThis).
  const store = (globalThis as unknown as { __pointsShopStub: { wallets: Map<string, { balance: number }> } }).__pointsShopStub;
  store.wallets.get(session!.walletId)!.balance = startingPoints;
  await addToCart(post("/api/cart", { slug }));
  const result = await (await checkout(post("/api/checkout"))).json();
  return { walletId: session!.walletId, orderId: result.orders[0].id as string };
}

function signed(body: object) {
  const raw = JSON.stringify(body);
  return new Request(`${ORIGIN}/api/webhooks/calcom`, {
    method: "POST",
    headers: { "x-cal-signature-256": createHmac("sha256", SECRET).update(raw).digest("hex") },
    body: raw,
  });
}

describe("fulfilment routes", () => {
  beforeEach(async () => {
    jar.clear();
    resetStubForTests();
    process.env.CALCOM_WEBHOOK_SECRET = SECRET;
    resetEnvForTests();
    await rm(LOCAL_EMAIL_DIR, { recursive: true, force: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CALCOM_WEBHOOK_SECRET;
    resetEnvForTests();
  });

  it("saves a question and moves the order to In Progress", async () => {
    const { orderId } = await signInAndBuy("q@example.com", "ask-sfcc-question");
    const res = await details(post(`/api/orders/${orderId}/details`, { question: "How do I add a SCAPI hook for baskets?" }), idParams(orderId));
    expect(res.status).toBe(200);
    expect((await res.json()).order).toMatchObject({ status: "In Progress", question: "How do I add a SCAPI hook for baskets?" });
  });

  it("rejects a resume URL that isn't this order's Blob upload", async () => {
    const { orderId } = await signInAndBuy("r@example.com", "resume-review");
    const res = await details(post(`/api/orders/${orderId}/details`, { resumeUrl: "https://evil.example/cv.pdf" }), idParams(orderId));
    expect(res.status).toBe(400);
    const ok = await details(
      post(`/api/orders/${orderId}/details`, { resumeUrl: `https://abc.public.blob.vercel-storage.com/resumes/${orderId}/resume-x1.pdf` }),
      idParams(orderId),
    );
    expect(ok.status).toBe(200);
  });

  it("awards 75 points for a review on a delivered order, once", async () => {
    const { orderId } = await signInAndBuy("rev@example.com", "ask-sfcc-question");
    expect((await review(post(`/api/orders/${orderId}/review`, { rating: 5 }), idParams(orderId))).status).toBe(409);
    deliverForTests(orderId);
    const first = await (await review(post(`/api/orders/${orderId}/review`, { rating: 5, text: "Great" }), idParams(orderId))).json();
    expect(first.pointsAwarded).toBe(75);
    const again = await (await review(post(`/api/orders/${orderId}/review`, { rating: 4 }), idParams(orderId))).json();
    expect(again).toMatchObject({ replay: true, pointsAwarded: 0 });
    expect((await review(post(`/api/orders/${orderId}/review`, { rating: 9 }), idParams(orderId))).status).toBe(400);
  });

  it("saves a Cal.com booking only with a valid signature and a matching order", async () => {
    const { walletId, orderId } = await signInAndBuy("b@example.com", "career-chat");
    const event = {
      triggerEvent: "BOOKING_CREATED",
      payload: { uid: "cal-123", startTime: "2026-12-01T10:00:00.000Z", metadata: { walletId, orderId } },
    };

    const forged = new Request(`${ORIGIN}/api/webhooks/calcom`, {
      method: "POST",
      headers: { "x-cal-signature-256": "deadbeef" },
      body: JSON.stringify(event),
    });
    expect((await calcom(forged)).status).toBe(401);

    const unknown = await calcom(signed({ ...event, payload: { ...event.payload, metadata: { walletId, orderId: "nope" } } }));
    expect(unknown.status).toBe(200);
    expect((await stubBackend.getOrder(walletId, orderId)).status).toBe("Awaiting Details");

    expect((await calcom(signed({ triggerEvent: "BOOKING_RESCHEDULED", payload: {} }))).status).toBe(200);

    const saved = await calcom(signed(event));
    expect(await saved.json()).toEqual({ saved: true });
    expect((await stubBackend.getOrder(walletId, orderId)).status).toBe("In Progress");
  });

  it("asks Cal.com to retry when the back end is down", async () => {
    const { walletId, orderId } = await signInAndBuy("down@example.com", "career-chat");
    process.env.STUB_FAIL = "all";
    const res = await calcom(
      signed({ triggerEvent: "BOOKING_CREATED", payload: { uid: "u", startTime: "2026-12-01T10:00:00Z", metadata: { walletId, orderId } } }),
    );
    delete process.env.STUB_FAIL;
    expect(res.status).toBe(503);
  });
});
