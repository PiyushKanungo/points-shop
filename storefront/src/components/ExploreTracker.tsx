"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { refreshShop } from "./refresh";

const VISITED = "ps_visited";
const DONE = "ps_explore_done";

/**
 * Honour-system "explore" task: after three distinct pages including How it's built, a signed-in
 * visitor gets the points (once per browser session).
 */
export function ExploreTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const visited = new Set<string>(JSON.parse(sessionStorage.getItem(VISITED) ?? "[]"));
      visited.add(pathname);
      sessionStorage.setItem(VISITED, JSON.stringify([...visited]));
      if (pathname !== "/how-its-built" || visited.size < 3 || sessionStorage.getItem(DONE)) return;
      void fetch("/api/tasks/explore", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then(
        (res) => {
          if (res.ok) {
            sessionStorage.setItem(DONE, "1");
            refreshShop();
          }
        },
      );
    } catch {
      // sessionStorage unavailable: skip silently.
    }
  }, [pathname]);

  return null;
}
