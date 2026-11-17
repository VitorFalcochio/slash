"use client";

import type { ReactNode } from "react";
import { AssistantPanel } from "@/components/ai/assistant-panel";
import { OrganizeDialog } from "@/components/ai/organize-dialog";
import { AutoLock } from "@/components/lock/auto-lock";
import { PasswordDialog } from "@/components/lock/password-dialog";
import { SearchCommand } from "@/components/search-command";
import { SettingsModal } from "@/components/settings-modal";
import { Sidebar } from "@/components/sidebar/sidebar";
import { useDocuments } from "@/store/documents";

export function DocumentsShell({ children }: { children: ReactNode }) {
  const hydrated = useDocuments((s) => s.hydrated);

  return (
    <div className="flex h-full">
      {/* Os dados vivem no IndexedDB do navegador; cada view espera eles carregarem. */}
      {hydrated && <Sidebar />}
      <main className="h-full min-w-0 flex-1 overflow-y-auto">{children}</main>
      {hydrated && <AssistantPanel />}
      {hydrated && <SearchCommand />}
      <SettingsModal />
      <PasswordDialog />
      {hydrated && <OrganizeDialog />}
      <AutoLock />
    </div>
  );
}
