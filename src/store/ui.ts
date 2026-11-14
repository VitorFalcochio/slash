"use client";

import { create } from "zustand";

type UiState = {
  searchOpen: boolean;
  settingsOpen: boolean;
  sidebarCollapsed: boolean;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

export const useUi = create<UiState>((set) => ({
  searchOpen: false,
  settingsOpen: false,
  sidebarCollapsed: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));
