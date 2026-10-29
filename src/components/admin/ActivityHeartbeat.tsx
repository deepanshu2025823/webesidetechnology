"use client";

import { useEffect } from "react";

const PING_MS = 60_000;
const IDLE_MS = 2 * 60_000;

/**
 * Reports one active minute at a time while this admin tab is in front and
 * someone has used the keyboard or mouse within the last two minutes. An idle
 * or hidden tab sends nothing, so walking away stops the clock.
 */
export function ActivityHeartbeat() {
  useEffect(() => {
    let lastInput = Date.now();
    const touch = () => {
      lastInput = Date.now();
    };
    const events = ["keydown", "mousemove", "mousedown", "wheel", "touchstart", "scroll"] as const;
    for (const e of events) window.addEventListener(e, touch, { passive: true });

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - lastInput > IDLE_MS) return;
      void fetch("/api/admin/activity", { method: "POST", keepalive: true }).catch(() => {});
    }, PING_MS);

    return () => {
      window.clearInterval(timer);
      for (const e of events) window.removeEventListener(e, touch);
    };
  }, []);

  return null;
}
