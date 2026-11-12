import "server-only";
import { cacheLife } from "next/cache";
import { getBackend } from "./backend";
import type { Catalog } from "./backend/types";

/**
 * The catalogue for public pages, cached for 10 minutes. Errors are not caught here: when a
 * background refresh fails, Next.js keeps serving the last good result (Goal 9).
 */
export async function getCachedCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 600, expire: 2_592_000 });
  return getBackend().getCatalog();
}
