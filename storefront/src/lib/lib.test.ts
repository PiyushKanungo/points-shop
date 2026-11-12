import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_CART_ITEMS, parseCart, withoutSlug, withSlug } from "./cart";
import { ShopError } from "./errors";
import { createToken, LINK_TTL_MS, verifyToken } from "./magic-link";
import { assertSameOrigin } from "./origin";
import { createSessionToken, readSessionToken } from "./session";
import { verifyTurnstile } from "./turnstile";

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof ShopError ? error.code : "OTHER";
  }
  return undefined;
}

describe("magic link tokens", () => {
  it("round-trips email, ref and millisecond times", () => {
    const now = 1_762_900_000_000;
    const payload = verifyToken(createToken("a@example.com", "REF12345", now), now + 1000);
    expect(payload).toEqual({ email: "a@example.com", ref: "REF12345", iat: now, exp: now + LINK_TTL_MS });
  });

  it("rejects tampered payloads, bad signatures and expired links", () => {
    const now = Date.now();
    const token = createToken("a@example.com", undefined, now);
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ email: "b@example.com", iat: now, exp: now + LINK_TTL_MS })).toString("base64url");
    expect(codeOf(() => verifyToken(`${forged}.${signature}`))).toBe("UNAUTHORIZED");
    expect(codeOf(() => verifyToken(`${payload}.short`))).toBe("UNAUTHORIZED");
    expect(codeOf(() => verifyToken(`${payload}`))).toBe("UNAUTHORIZED");
    expect(codeOf(() => verifyToken(token, now + LINK_TTL_MS + 1))).toBe("UNAUTHORIZED");
  });
});

describe("session tokens", () => {
  it("round-trips and rejects tampering", async () => {
    const token = await createSessionToken({ walletId: "w1", email: "a@example.com" });
    expect(await readSessionToken(token)).toEqual({ walletId: "w1", email: "a@example.com" });
    expect(await readSessionToken(`${token}x`)).toBeNull();
    expect(await readSessionToken(undefined)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    vi.useFakeTimers();
    const token = await createSessionToken({ walletId: "w1", email: "a@example.com" });
    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(await readSessionToken(token)).toBeNull();
    vi.useRealTimers();
  });
});

describe("cart", () => {
  it("adds once, rotates the key on change and caps at four", () => {
    const empty = parseCart(undefined);
    const one = withSlug(empty, "career-chat");
    expect(one.slugs).toEqual(["career-chat"]);
    expect(one.checkoutKey).not.toBe(empty.checkoutKey);
    expect(withSlug(one, "career-chat")).toBe(one);

    let full = one;
    for (const slug of ["a", "b", "c"]) full = withSlug(full, slug);
    expect(full.slugs).toHaveLength(MAX_CART_ITEMS);
    expect(codeOf(() => withSlug(full, "e"))).toBe("VALIDATION");

    const removed = withoutSlug(full, "a");
    expect(removed.slugs).not.toContain("a");
    expect(removed.checkoutKey).not.toBe(full.checkoutKey);
  });

  it("treats a bad cookie as an empty cart", () => {
    expect(parseCart("not json").slugs).toEqual([]);
    expect(parseCart(JSON.stringify({ slugs: "x" })).slugs).toEqual([]);
  });
});

describe("origin check", () => {
  const post = (origin?: string) =>
    new Request("http://localhost:3100/api/cart", { method: "POST", headers: origin ? { origin } : {} });

  it("accepts the site origin and rejects others", () => {
    expect(codeOf(() => assertSameOrigin(post("http://localhost:3100")))).toBeUndefined();
    expect(codeOf(() => assertSameOrigin(post("https://evil.example")))).toBe("FORBIDDEN");
    expect(codeOf(() => assertSameOrigin(post()))).toBe("FORBIDDEN");
    expect(codeOf(() => assertSameOrigin(new Request("http://localhost:3100/api/session")))).toBeUndefined();
  });
});

describe("turnstile", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("passes on success and maps failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })));
    await expect(verifyTurnstile("token", "1.2.3.4")).resolves.toBeUndefined();

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: false })));
    await expect(verifyTurnstile("token")).rejects.toMatchObject({ code: "VALIDATION" });

    await expect(verifyTurnstile(undefined)).rejects.toMatchObject({ code: "VALIDATION" });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 502 })));
    await expect(verifyTurnstile("token")).rejects.toMatchObject({ code: "UNAVAILABLE" });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    await expect(verifyTurnstile("token")).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});
