"use client";

import { useEffect, useState } from "react";
import { flushPageContent } from "./page-content";

/** Estado da atualização automática; null fora do Electron. */
export function useUpdateStatus() {
  const [status, setStatus] = useState<SlashUpdateStatus | null>(null);

  useEffect(() => {
    const updates = window.slash?.updates;
    if (!updates) return;
    updates.getStatus().then(setStatus);
    return updates.onStatus(setStatus);
  }, []);

  return status;
}

/** Grava o que estiver pendente no editor e reinicia instalando a nova versão. */
export function installUpdate() {
  flushPageContent();
  return window.slash?.updates.install();
}
