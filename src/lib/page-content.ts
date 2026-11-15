// Conteúdo das páginas: cada uma tem o próprio arquivo (pages/<id>.json no app nativo),
// lido só quando a página é aberta e gravado só depois de uma pausa na digitação.
import { appStorage, backend } from "./storage";

const SAVE_DELAY = 500;

const key = (id: string) => `page-${id}`;

type Pending = { timer: ReturnType<typeof setTimeout>; serialize: () => string; onSaved?: () => void };
const pending = new Map<string, Pending>();

/** Lê o conteúdo salvo. Lança erro se a leitura falhar (nesse caso a página não deve abrir para edição). */
export async function loadPageContent(id: string): Promise<string | null> {
  const storage = backend();
  if (!storage) return null;
  return (await storage.getItem(key(id))) ?? null;
}

/**
 * Agenda a gravação. `serialize` só roda na hora de gravar, então digitar não custa nada
 * além de reagendar o timer. `onSaved` roda logo após enviar para o disco.
 */
export function savePageContent(id: string, serialize: () => string, onSaved?: () => void) {
  const current = pending.get(id);
  if (current) clearTimeout(current.timer);
  pending.set(id, { timer: setTimeout(() => flushPageContent(id), SAVE_DELAY), serialize, onSaved });
}

/** Grava já o que estiver na fila (de uma página ou de todas). */
export function flushPageContent(id?: string) {
  for (const target of id ? [id] : [...pending.keys()]) {
    const item = pending.get(target);
    if (!item) continue;
    clearTimeout(item.timer);
    pending.delete(target);
    void appStorage.setItem(key(target), item.serialize());
    item.onSaved?.();
  }
}

/** Grava direto, sem esperar (usado na migração). */
export function writePageContent(id: string, content: string) {
  return appStorage.setItem(key(id), content);
}

export function deletePageContent(id: string) {
  const item = pending.get(id);
  if (item) clearTimeout(item.timer);
  pending.delete(id);
  return appStorage.removeItem(key(id));
}

// Ao fechar a janela, o que estava esperando a pausa vai para o disco.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => flushPageContent());
}
