"use client";

import { create } from "zustand";

type UiState = {
  searchOpen: boolean;
  settingsOpen: boolean;
  sidebarCollapsed: boolean;
  /** Pasta com o nome em edição na barra lateral (abre assim que é criada). */
  renamingFolderId: string | null;
  /** Janela de senha mestra aberta. `protectDocId`: proteger esta página assim que a senha for criada. */
  passwordDialog: { mode: "create" | "change"; protectDocId?: string } | null;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRenamingFolderId: (id: string | null) => void;
  setPasswordDialog: (dialog: UiState["passwordDialog"]) => void;
};

export const useUi = create<UiState>((set) => ({
  searchOpen: false,
  settingsOpen: false,
  sidebarCollapsed: false,
  renamingFolderId: null,
  passwordDialog: null,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setRenamingFolderId: (renamingFolderId) => set({ renamingFolderId }),
  setPasswordDialog: (passwordDialog) => set({ passwordDialog }),
}));
