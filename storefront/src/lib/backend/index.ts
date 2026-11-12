import "server-only";
import { getEnv } from "../env";
import { salesforceBackend } from "./salesforce";
import { stubBackend } from "./stub";
import type { ShopBackend } from "./types";

export function getBackend(): ShopBackend {
  return getEnv().SHOP_BACKEND === "salesforce" ? salesforceBackend : stubBackend;
}

export type * from "./types";
