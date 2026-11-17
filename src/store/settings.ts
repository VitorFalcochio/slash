"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { appStorage } from "@/lib/storage";

export const ACCENTS = [
  { id: "blue", name: "Azul", value: null },
  { id: "purple", name: "Roxo", value: "#8b5cf6" },
  { id: "green", name: "Verde", value: "#16a34a" },
  { id: "orange", name: "Laranja", value: "#ea580c" },
  { id: "pink", name: "Rosa", value: "#db2777" },
  { id: "red", name: "Vermelho", value: "#dc2626" },
] as const;

export type Accent = (typeof ACCENTS)[number]["id"];
export type FontStyle = "sans" | "serif" | "mono";
export type FontSize = "small" | "normal" | "large";
export type ThemeChoice = "light" | "dark" | "system";

type Settings = {
  /**
   * Também guardado aqui (além do next-themes, que usa o localStorage) para acompanhar a pasta de dados
   * quando ela muda de lugar. null = ainda não salvo; adota o tema em uso.
   */
  theme: ThemeChoice | null;
  accent: Accent;
  font: FontStyle;
  fontSize: FontSize;
  fullWidth: boolean;
  startPage: "home" | "last";
  lastPageId: string | null;
  spellcheck: boolean;
  /** Senha mestra das páginas protegidas: só o sal e o hash PBKDF2 (ver lib/lock.ts). */
  lockSalt: string | null;
  lockHash: string | null;
  /** Modelo do Gemini usado pelo assistente (ver lib/ai.ts). */
  aiModel: string;
};

type SettingsState = Settings & {
  hydrated: boolean;
  set: (patch: Partial<Settings>) => void;
};

const DEFAULTS: Settings = {
  theme: null,
  accent: "blue",
  font: "sans",
  fontSize: "normal",
  fullWidth: false,
  startPage: "last",
  lastPageId: null,
  spellcheck: true,
  lockSalt: null,
  lockHash: null,
  aiModel: "gemini-3.8-flash",
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hydrated: false,
      set: (patch) => set(patch),
    }),
    {
      name: "slash-settings",
      storage: createJSONStorage(() => appStorage),
      partialize: (s): Settings => {
        const settings = { ...s } as Partial<SettingsState>;
        delete settings.hydrated;
        delete settings.set;
        return settings as Settings;
      },
      onRehydrateStorage: () => () => useSettings.setState({ hydrated: true }),
    },
  ),
);
