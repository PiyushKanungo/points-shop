import { ShopError } from "../errors";
import { FIXTURE_CATALOG } from "./fixtures";
import type { CheckoutResult, Order, ShopBackend, TaskResult, VerifyResult, Wallet } from "./types";

/**
 * Local stand-in for the Salesforce API. It keeps just enough state for the happy path to work
 * end to end and enforces none of the points rules (those live in Apex only).
 *
 * Canned errors: an email containing "+short" gets INSUFFICIENT_POINTS on checkout; one
 * containing "+down" gets UNAVAILABLE on every call.
 */
interface StubState {
  wallets: Map<string, Wallet>;
  orders: Map<string, Order[]>;
  seq: number;
}

const globalStore = globalThis as typeof globalThis & { __pointsShopStub?: StubState };
// Kept on globalThis so every route bundle and hot reload in `next dev` shares one store.
const state: StubState = (globalStore.__pointsShopStub ??= { wallets: new Map(), orders: new Map(), seq: 0 });

/** STUB_FAIL=catalog fails getCatalog; STUB_FAIL=all fails every call (Goal 9 testing). */
function failIfAsked(isCatalog: boolean) {
  const mode = process.env.STUB_FAIL;
  if (mode === "all" || (mode === "catalog" && isCatalog)) throw new ShopError("UNAVAILABLE");
}

function walletOrThrow(walletId: string): Wallet {
  failIfAsked(false);
  const wallet = state.wallets.get(walletId);
  if (!wallet) throw new ShopError("NOT_FOUND", "Wallet not found.");
  if (wallet.email.includes("+down")) throw new ShopError("UNAVAILABLE");
  return wallet;
}

function addEntry(wallet: Wallet, amount: number, entryType: Wallet["recentEntries"][number]["entryType"], reason: string) {
  wallet.balance += amount;
  wallet.recentEntries.unshift({
    id: `L-${++state.seq}`,
    amount,
    entryType,
    reason,
    createdAt: new Date().toISOString(),
  });
  wallet.recentEntries = wallet.recentEntries.slice(0, 20);
}

export const stubBackend: ShopBackend = {
  async getCatalog() {
    failIfAsked(true);
    return structuredClone(FIXTURE_CATALOG);
  },

  async verifySignIn(email: string): Promise<VerifyResult> {
    failIfAsked(false);
    const normalised = email.trim().toLowerCase();
    if (normalised.includes("+down")) throw new ShopError("UNAVAILABLE");
    const existing = [...state.wallets.values()].find((w) => w.email === normalised);
    if (existing) return { wallet: structuredClone(existing), isNew: false };

    const id = `stub-wallet-${++state.seq}`;
    const wallet: Wallet = {
      id,
      email: normalised,
      balance: 0,
      referralCode: `STUB${String(state.seq).padStart(4, "0")}`,
      recentEntries: [],
      taskCounts: { signup: 1 },
    };
    addEntry(wallet, 50, "Earn", "Task: Sign up with email");
    state.wallets.set(id, wallet);
    state.orders.set(id, []);
    return { wallet: structuredClone(wallet), isNew: true };
  },

  async getWallet(walletId: string) {
    return structuredClone(walletOrThrow(walletId));
  },

  async completeTask(walletId: string, taskKey: string): Promise<TaskResult> {
    const wallet = walletOrThrow(walletId);
    const task = FIXTURE_CATALOG.tasks.find((t) => t.key === taskKey);
    if (!task) throw new ShopError("NOT_FOUND", "Task not found.");
    if (task.verification !== "Form" && task.verification !== "Honour") {
      throw new ShopError("VALIDATION", "This task cannot be completed directly.");
    }
    if ((wallet.taskCounts[taskKey] ?? 0) > 0) {
      return { pointsAwarded: 0, replay: true, balance: wallet.balance };
    }
    wallet.taskCounts[taskKey] = 1;
    addEntry(wallet, task.points, "Earn", `Task: ${task.name}`);
    return { pointsAwarded: task.points, replay: false, balance: wallet.balance };
  },

  async checkout(walletId: string, checkoutKey: string, slugs: string[]): Promise<CheckoutResult> {
    const wallet = walletOrThrow(walletId);
    const orders = state.orders.get(walletId) ?? [];
    const previous = orders.filter((o) => o.id.startsWith(`${checkoutKey}:`));
    if (previous.length > 0) {
      return { orders: structuredClone(previous), replay: true, balance: wallet.balance };
    }
    const offerings = slugs.map((slug) => {
      const offering = FIXTURE_CATALOG.offerings.find((o) => o.slug === slug);
      if (!offering) throw new ShopError("NOT_FOUND", `Offering not found: ${slug}`);
      return offering;
    });
    const total = offerings.reduce((sum, o) => sum + o.pointsPrice, 0);
    if (wallet.email.includes("+short") || wallet.balance < total) {
      throw new ShopError("INSUFFICIENT_POINTS", "Not enough points.");
    }
    const created: Order[] = offerings.map((offering) => {
      const number = `PS-${String(++state.seq).padStart(4, "0")}`;
      addEntry(wallet, -offering.pointsPrice, "Redeem", `Order ${number}`);
      return {
        id: `${checkoutKey}:${offering.slug}`,
        orderNumber: number,
        offering: { slug: offering.slug, name: offering.name, fulfilmentType: offering.fulfilmentType },
        status: "Awaiting Details",
        pointsSpent: offering.pointsPrice,
        question: null,
        resumeUrl: null,
        bookingStart: null,
        createdAt: new Date().toISOString(),
        deliveredAt: null,
        cancelledAt: null,
        review: null,
      };
    });
    state.orders.set(walletId, [...created, ...orders]);
    return { orders: structuredClone(created), replay: false, balance: wallet.balance };
  },

  async listOrders(walletId: string) {
    walletOrThrow(walletId);
    return structuredClone(state.orders.get(walletId) ?? []);
  },

  async getOrder(walletId: string, orderId: string) {
    walletOrThrow(walletId);
    const order = (state.orders.get(walletId) ?? []).find((o) => o.id === orderId);
    if (!order) throw new ShopError("NOT_FOUND", "Order not found.");
    return structuredClone(order);
  },
};

/** For tests only. */
export function resetStubForTests() {
  state.wallets.clear();
  state.orders.clear();
  state.seq = 0;
}
