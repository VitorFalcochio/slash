import type { StateStorage } from "zustand/middleware";

// Fallback quando o app é aberto num navegador comum (fora do Electron).
const DB_NAME = "slash";
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => {
        const db = request.result;
        // O navegador pode fechar a conexão (ex.: disco cheio); a próxima operação reabre.
        db.onclose = () => (dbPromise = null);
        resolve(db);
      };
      request.onerror = () => reject(request.error);
    });
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

async function runOnce<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await getDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error ?? new Error("Transação abortada"));
    tx.onerror = () => reject(tx.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  try {
    return await runOnce(mode, fn);
  } catch {
    // Uma nova tentativa com conexão nova resolve conexões fechadas pelo navegador.
    dbPromise = null;
    return runOnce(mode, fn);
  }
}

export const idbStorage: StateStorage = {
  getItem: async (name) => (await run<string | undefined>("readonly", (s) => s.get(name))) ?? null,
  setItem: async (name, value) => {
    await run("readwrite", (s) => s.put(value, name));
  },
  removeItem: async (name) => {
    await run("readwrite", (s) => s.delete(name));
  },
};
