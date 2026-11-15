import { toast } from "sonner";
import type { StateStorage } from "zustand/middleware";
import { fileToDataUrl } from "@/lib/utils";
import { idbStorage } from "./idb-storage";

// No app nativo os dados vão para o disco (pasta de dados no E:, ver electron/main.cjs).
export function backend(): StateStorage | null {
  if (typeof window === "undefined") return null;
  if (window.slash) {
    return {
      getItem: (name) => window.slash!.storage.get(name),
      setItem: (name, value) => window.slash!.storage.set(name, value),
      removeItem: (name) => window.slash!.storage.remove(name),
    };
  }
  return typeof indexedDB === "undefined" ? null : idbStorage;
}

// Se a leitura falhar, o app abre vazio; gravar nesse estado apagaria os dados reais.
let writesBlocked = false;
let lastSaveErrorToast = 0;

function reportSaveError(error: unknown) {
  console.error("Falha ao salvar", error);
  if (Date.now() - lastSaveErrorToast < 10_000) return;
  lastSaveErrorToast = Date.now();
  toast.error("Não foi possível salvar suas alterações. Verifique o espaço em disco.");
}

export const appStorage: StateStorage = {
  getItem: async (name) => {
    const storage = backend();
    if (!storage) return null;
    try {
      return await storage.getItem(name);
    } catch (error) {
      writesBlocked = true;
      console.error("Falha ao carregar", error);
      toast.error("Não foi possível carregar suas páginas. Alterações não serão salvas até reiniciar.", {
        duration: Infinity,
      });
      return null;
    }
  },
  setItem: async (name, value) => {
    const storage = backend();
    if (!storage || writesBlocked) return;
    try {
      await storage.setItem(name, value);
    } catch (error) {
      reportSaveError(error);
    }
  },
  removeItem: async (name) => {
    if (writesBlocked) return;
    await backend()?.removeItem(name);
  },
};

/** Salva um arquivo enviado (imagem, anexo) e devolve a URL para exibi-lo. */
export async function saveUpload(file: File) {
  if (window.slash) return window.slash.saveFile(file.name, await file.arrayBuffer());
  return fileToDataUrl(file);
}
