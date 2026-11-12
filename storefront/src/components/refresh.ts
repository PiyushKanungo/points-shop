"use client";

import { useEffect } from "react";

const EVENT = "shop:refresh";

/** Tells the header (balance, cart count) and the earn panel to reload after an action. */
export function refreshShop() {
  window.dispatchEvent(new Event(EVENT));
}

export function useShopRefresh(callback: () => void) {
  useEffect(() => {
    window.addEventListener(EVENT, callback);
    return () => window.removeEventListener(EVENT, callback);
  }, [callback]);
}
