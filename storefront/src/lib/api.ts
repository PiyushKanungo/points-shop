import "server-only";
import type { z } from "zod";
import { ShopError } from "./errors";
import { getSession, type Session } from "./session";

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ShopError("UNAUTHORIZED", "Sign in first.");
  return session;
}

/** Parses a JSON body with the schema; an empty body is treated as {}. */
export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const text = await request.text();
  let value: unknown = {};
  if (text.trim()) {
    try {
      value = JSON.parse(text);
    } catch {
      throw new ShopError("VALIDATION", "The request body is not valid JSON.");
    }
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ShopError("VALIDATION", result.error.issues[0]?.message ?? "Invalid request.");
  }
  return result.data;
}

/** Same rule as WalletService.EMAIL_PATTERN in Apex. */
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
