import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake cookie store for next/headers (route handlers call cookies() outside a real request).
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

// connection() only works inside a real request; in tests it is a no-op.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => undefined,
}));

const { POST: link } = await import("./auth/link/route");
const { POST: verify } = await import("./auth/verify/route");
const { GET: session } = await import("./session/route");
const { POST: addToCart } = await import("./cart/route");
const { POST: checkout } = await import("./checkout/route");
const { POST: task } = await import("./tasks/[key]/route");
const { resetStubForTests } = await import("@/lib/backend/stub");
const { LOCAL_EMAIL_DIR } = await import("@/lib/email/send");

const ORIGIN = "http://localhost:3100";

function post(url: string, body?: unknown, origin: string | null = ORIGIN) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin) headers.origin = origin;
  return new Request(`${ORIGIN}${url}`, { method: "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

const params = (key: string) => ({ params: Promise.resolve({ key }) }) as never;

async function newestEmail(kind: string) {
  const files = (await readdir(LOCAL_EMAIL_DIR)).filter((f) => f.endsWith(`-${kind}.json`)).sort();
  return JSON.parse(await readFile(path.join(LOCAL_EMAIL_DIR, files.at(-1)!), "utf8"));
}

async function signIn(email: string) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })));
  const res = await link(post("/api/auth/link", { email, turnstileToken: "XXXX.DUMMY.TOKEN" }));
  expect(res.status).toBe(200);
  const token = (await newestEmail("magic-link")).text.match(/#token=([\w.-]+)/)[1];
  const verified = await verify(post("/api/auth/verify", { token }));
  expect(verified.status).toBe(200);
  return token as string;
}

describe("API routes on the stub backend", () => {
  beforeEach(async () => {
    jar.clear();
    resetStubForTests();
    await rm(LOCAL_EMAIL_DIR, { recursive: true, force: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.STUB_FAIL;
  });

  it("signs in by magic link and reports the session", async () => {
    await signIn("visitor@example.com");
    const body = await (await session()).json();
    expect(body).toMatchObject({ signedIn: true, email: "visitor@example.com", balance: 50, cartCount: 0 });
    expect((await newestEmail("welcome")).to).toBe("visitor@example.com");
  });

  it("rejects requests from another origin", async () => {
    const res = await link(post("/api/auth/link", { email: "a@example.com" }, "https://evil.example"));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("requires a session for tasks, cart and checkout", async () => {
    expect((await task(post("/api/tasks/explore", {}), params("explore"))).status).toBe(401);
    expect((await addToCart(post("/api/cart", { slug: "career-chat" }))).status).toBe(401);
    expect((await checkout(post("/api/checkout"))).status).toBe(401);
  });

  it("ignores a wallet ID in the request body", async () => {
    await signIn("me@example.com");
    const res = await task(post("/api/tasks/explore", { walletId: "someone-else" }), params("explore"));
    expect(res.status).toBe(200);
    const me = await (await session()).json();
    expect(me.balance).toBe(80);
  });

  it("rejects system tasks and requires the check on form tasks", async () => {
    await signIn("tasks@example.com");
    expect((await task(post("/api/tasks/signup", {}), params("signup"))).status).toBe(400);

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: false })));
    const failed = await task(post("/api/tasks/feedback", { message: "Lovely site, thanks!" }), params("feedback"));
    expect(failed.status).toBe(400);

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })));
    const ok = await task(post("/api/tasks/feedback", { message: "Lovely site, thanks!", turnstileToken: "t" }), params("feedback"));
    expect(ok.status).toBe(200);
    expect((await ok.json()).pointsAwarded).toBe(50);
    const forwarded = await newestEmail("visitor-message");
    expect(forwarded).toMatchObject({ to: "owner@example.com", replyTo: "tasks@example.com" });
  });

  it("checks out the cart, clears it and emails the visitor and Piyush", async () => {
    await signIn("buyer@example.com");
    await task(post("/api/tasks/explore", {}), params("explore"));
    await task(post("/api/tasks/linkedin-post", {}), params("linkedin-post"));
    expect((await addToCart(post("/api/cart", { slug: "ask-sfcc-question" }))).status).toBe(200);
    expect((await addToCart(post("/api/cart", { slug: "no-such-thing" }))).status).toBe(404);

    const res = await checkout(post("/api/checkout"));
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].status).toBe("Awaiting Details");
    expect(result.balance).toBe(0);
    expect((await (await session()).json()).cartCount).toBe(0);
    expect((await newestEmail("order-confirmed")).to).toBe("buyer@example.com");
    expect((await newestEmail("owner-alert")).to).toBe("owner@example.com");

    expect((await checkout(post("/api/checkout"))).status).toBe(400);
  });

  it("maps a short balance to 409", async () => {
    await signIn("poor@example.com");
    await addToCart(post("/api/cart", { slug: "mock-interview" }));
    const res = await checkout(post("/api/checkout"));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("INSUFFICIENT_POINTS");
  });

  it("rejects a reused or tampered magic link", async () => {
    const token = await signIn("again@example.com");
    const tampered = await verify(post("/api/auth/verify", { token: `${token}x` }));
    expect(tampered.status).toBe(401);
  });

  it("keeps the session usable when the backend is down (Goal 9)", async () => {
    await signIn("outage@example.com");
    process.env.STUB_FAIL = "all";
    const body = await (await session()).json();
    expect(body).toMatchObject({ signedIn: true, balance: null, error: "UNAVAILABLE" });
  });
});
