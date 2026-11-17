"use client";

import { create } from "zustand";

type UiState = {
  searchOpen: boolean;
  settingsOpen: boolean;
  /** Seção das configurações a mostrar quando abrir (ex.: "ai" pelo aviso do assistente). */
  settingsSection: string | null;
  sidebarCollapsed: boolean;
  /** Pasta com o nome em edição na barra lateral (abre assim que é criada). */
  renamingFolderId: string | null;
  /** Janela de senha mestra aberta. `protectDocId`: proteger esta página assim que a senha for criada. */
  passwordDialog: { mode: "create" | "change"; protectDocId?: string } | null;
  /** Painel do assistente de IA à direita. */
  assistantOpen: boolean;
  /** Janela "Organizar matérias" (sugestões de etiquetas e pastas pela IA). */
  organizeOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean, section?: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRenamingFolderId: (id: string | null) => void;
  setPasswordDialog: (dialog: UiState["passwordDialog"]) => void;
  setAssistantOpen: (open: boolean) => void;
  setOrganizeOpen: (open: boolean) => void;
};

export const useUi = create<UiState>((set) => ({
  searchOpen: false,
  settingsOpen: false,
  settingsSection: null,
  sidebarCollapsed: false,
  renamingFolderId: null,
  passwordDialog: null,
  assistantOpen: false,
  organizeOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSettingsOpen: (settingsOpen, section) => set({ settingsOpen, settingsSection: section ?? null }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setRenamingFolderId: (renamingFolderId) => set({ renamingFolderId }),
  setPasswordDialog: (passwordDialog) => set({ passwordDialog }),
  setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
  setOrganizeOpen: (organizeOpen) => set({ organizeOpen }),
}));
