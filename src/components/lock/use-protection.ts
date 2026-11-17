"use client";

import { toast } from "sonner";
import { hasMasterPassword, useLock } from "@/lib/lock";
import { useDocuments, type Doc } from "@/store/documents";
import { useUi } from "@/store/ui";

/** Liga/desliga a senha de uma página. Na primeira vez, pede para criar a senha mestra. */
export function toggleProtection(doc: Doc) {
  const { update } = useDocuments.getState();
  if (doc.isLocked) {
    if (!useLock.getState().unlocked) {
      toast.error("Desbloqueie a página antes de remover a senha");
      return;
    }
    update(doc.id, { isLocked: false });
    toast.success("Senha removida da página");
    return;
  }
  if (!hasMasterPassword()) {
    useUi.getState().setPasswordDialog({ mode: "create", protectDocId: doc.id });
    return;
  }
  update(doc.id, { isLocked: true });
  toast.success("Página protegida com senha");
}
