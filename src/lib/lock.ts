"use client";

// Páginas protegidas por senha (bloqueio na tela).
//
// Uma senha mestra desbloqueia todas as páginas protegidas de uma vez. Depois de 5 minutos sem
// mexer no app, tudo volta a ficar bloqueado. A senha não é guardada: só um hash PBKDF2 com sal,
// nas configurações. O conteúdo das páginas continua sem criptografia nos arquivos da pasta de dados;
// a proteção vale para quem usa o app.
import { create } from "zustand";
import { flushPageContent } from "./page-content";
import { useSettings } from "@/store/settings";

export const AUTO_LOCK_MS = 5 * 60 * 1000;
const ITERATIONS = 210_000;

const toBase64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS },
    key,
    256,
  );
  return toBase64(bits);
}

/** Gera o par sal + hash para guardar nas configurações. */
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { lockSalt: toBase64(salt), lockHash: await derive(password, salt) };
}

export async function checkPassword(password: string) {
  const { lockSalt, lockHash } = useSettings.getState();
  if (!lockSalt || !lockHash) return false;
  const attempt = await derive(password, fromBase64(lockSalt));
  // Comparação em tempo constante (não para no primeiro caractere diferente).
  let diff = attempt.length ^ lockHash.length;
  for (let i = 0; i < Math.min(attempt.length, lockHash.length); i++) diff |= attempt.charCodeAt(i) ^ lockHash.charCodeAt(i);
  return diff === 0;
}

export function hasMasterPassword() {
  const { lockSalt, lockHash } = useSettings.getState();
  return Boolean(lockSalt && lockHash);
}

type LockState = {
  /** Páginas protegidas estão liberadas nesta sessão. Nunca é salvo: abrir o app começa bloqueado. */
  unlocked: boolean;
  lastActivity: number;
  unlock: () => void;
  lock: () => void;
  touch: () => void;
};

export const useLock = create<LockState>((set, get) => ({
  unlocked: false,
  lastActivity: 0,
  unlock: () => set({ unlocked: true, lastActivity: Date.now() }),
  lock: () => {
    if (!get().unlocked) return;
    // Grava o que estava sendo digitado antes de esconder o editor.
    flushPageContent();
    set({ unlocked: false });
  },
  // Chamado a cada tecla/movimento; só atualiza a cada poucos segundos para não re-renderizar à toa.
  touch: () => {
    const { unlocked, lastActivity } = get();
    if (unlocked && Date.now() - lastActivity > 5000) set({ lastActivity: Date.now() });
  },
}));

/** Tenta desbloquear com a senha. Devolve se deu certo. */
export async function unlockWith(password: string) {
  const ok = await checkPassword(password);
  if (ok) useLock.getState().unlock();
  return ok;
}
