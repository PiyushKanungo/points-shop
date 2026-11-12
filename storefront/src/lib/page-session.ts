import "server-only";
import { redirect } from "next/navigation";
import { getSession, type Session } from "./session";

/** For signed-in pages (call inside a Suspense boundary): redirects to sign-in when needed. */
export async function requirePageSession(nextPath: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/signin?next=${encodeURIComponent(nextPath)}`);
  return session;
}
