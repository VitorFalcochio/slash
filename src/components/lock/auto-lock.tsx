"use client";

import { useEffect } from "react";
import { AUTO_LOCK_MS, useLock } from "@/lib/lock";

/** Bloqueia de novo as páginas protegidas depois de 5 minutos sem mexer no app. */
export function AutoLock() {
  const unlocked = useLock((s) => s.unlocked);

  useEffect(() => {
    if (!unlocked) return;
    const { touch, lock } = useLock.getState();
    const events = ["pointerdown", "pointermove", "keydown", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - useLock.getState().lastActivity >= AUTO_LOCK_MS) lock();
    }, 10_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(timer);
    };
  }, [unlocked]);

  return null;
}
