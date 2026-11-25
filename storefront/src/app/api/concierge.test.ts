import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (jar.has(n) ? { name: n, value: jar.get(n)! } : undefined),
    set: (n: string, v: string) => void jar.set(n, v),
    delete: (n: string) => void jar.delete(n),
  }),
}));

import { getBackend } from "@/lib/backend";
import { getChat } from "@/lib/chat-cookie";
import { setSession } from "@/lib/session";
import { POST as chat } from "./concierge/route";
import { POST as signout } from "./auth/signout/route";

process.env.LOCAL_EMAIL_DIR = ".local-email/concierge-test";
const ORIGIN = "http://localhost:3100";
const req = (body: unknown) =>
  new Request(`${ORIGIN}/api/concierge`, { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json" }, body: JSON.stringify(body) });

async function signIn(email: string) {
  const { wallet } = await getBackend().verifySignIn(email, Date.now());
  await setSession({ walletId: wallet.id, email });
  return wallet.id;
}

describe("concierge", () => {
  beforeEach(() => jar.clear());

  it("needs a session and a message", async () => {
    expect((await chat(req({ message: "hi" }))).status).toBe(401);
    await signIn("chat1@example.com");
    expect((await chat(req({ message: " " }))).status).toBe(400);
  });

  it("answers, and ignores another wallet's chat cookie", async () => {
    const first = await signIn("chat2@example.com");
    const res = await chat(req({ message: "balance?", fresh: true }));
    expect((await res.json()).reply).toBe("You have 50 points.");
    expect((await getChat(first))?.sessionId).toBe("stub-session");
    const second = await signIn("chat3@example.com");
    expect(await getChat(second)).toBeNull();
  });

  it("is cleared on sign out", async () => {
    await signIn("chat4@example.com");
    await chat(req({ message: "hi", fresh: true }));
    expect(jar.has("ps_chat")).toBe(true);
    await signout(new Request(`${ORIGIN}/api/auth/signout`, { method: "POST", headers: { origin: ORIGIN } }));
    expect(jar.has("ps_chat")).toBe(false);
  });

  it("reports an order placed in chat", async () => {
    const id = await signIn("chat5@example.com");
    await getBackend().completeTask(id, "feedback");
    const res = await chat(req({ message: "order ask-sfcc-question", fresh: true }));
    expect((await res.json()).orderPlaced).toBe(true);
  });
});
