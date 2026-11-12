"use client";

import { useEffect } from "react";

/** Remembers a referral code from ?ref= so sign-in can pass it on. */
export function RefCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[A-Za-z0-9]{4,12}$/.test(ref)) {
      try {
        localStorage.setItem("ps_ref", ref.toUpperCase());
      } catch {
        // storage unavailable
      }
    }
  }, []);
  return null;
}
