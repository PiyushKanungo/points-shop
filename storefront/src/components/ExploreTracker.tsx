"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "./Header";
import { refreshShop } from "./refresh";

const VISITED = "ps_visited";
const DONE = "ps_explore_done";

/**
 * Honour-system "explore" task: after three distinct pages including How it's built, a signed-in
 * visitor gets the points. Pages seen before signing in count too.
 */
export function ExploreTracker() {
  const pathname = usePathname();
  const session = useSession();
  const email = session?.signedIn ? session.email : undefined;

  useEffect(() => {
    try {
      const visited = new Set<string>(JSON.parse(sessionStorage.getItem(VISITED) ?? "[]"));
      visited.add(pathname);
      sessionStorage.setItem(VISITED, JSON.stringify([...visited]));
      if (!email || !visited.has("/how-its-built") || visited.size < 3 || sessionStorage.getItem(DONE) === email) return;
      sessionStorage.setItem(DONE, email);
      void fetch("/api/tasks/explore", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then(
        (res) => {
          if (res.ok) refreshShop();
          else sessionStorage.removeItem(DONE);
        },
        () => sessionStorage.removeItem(DONE),
      );
    } catch {
      // sessionStorage unavailable: skip silently.
    }
  }, [pathname, email]);

  return null;
}
