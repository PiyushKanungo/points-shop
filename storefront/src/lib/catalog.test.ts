import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: () => undefined }));

describe("getCachedCatalog", () => {
  afterEach(() => {
    delete process.env.STUB_FAIL;
  });

  it("returns the catalogue", async () => {
    const { getCachedCatalog } = await import("./catalog");
    const catalog = await getCachedCatalog();
    expect(catalog.offerings).toHaveLength(4);
    expect(catalog.tasks).toHaveLength(8);
  });

  it("propagates UNAVAILABLE so Next.js keeps the last good page (Goal 9)", async () => {
    process.env.STUB_FAIL = "catalog";
    const { getCachedCatalog } = await import("./catalog");
    await expect(getCachedCatalog()).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});
