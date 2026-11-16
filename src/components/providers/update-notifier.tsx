"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { installUpdate, useUpdateStatus } from "@/lib/use-update-status";

// Quando uma nova versão termina de baixar, mostra um aviso com o botão para reiniciar.
// Se a pessoa ignorar, a atualização é instalada na próxima vez que o app fechar.
export function UpdateNotifier() {
  const status = useUpdateStatus();
  const shownFor = useRef<string | null>(null);

  useEffect(() => {
    if (status?.state !== "downloaded" || !status.version || shownFor.current === status.version) return;
    shownFor.current = status.version;
    toast(`Nova versão do Slash pronta (${status.version})`, {
      description: "Reinicie para atualizar, ou ela será instalada quando você fechar o app.",
      duration: Infinity,
      action: { label: "Reiniciar agora", onClick: () => installUpdate() },
      cancel: { label: "Depois", onClick: () => {} },
    });
  }, [status]);

  return null;
}
