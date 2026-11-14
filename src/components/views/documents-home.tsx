"use client";

import { Menu, PlusCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDocuments } from "@/store/documents";
import { useUi } from "@/store/ui";
import { DocumentView } from "./document-view";

export function DocumentsHome() {
  const id = useSearchParams().get("id");
  const hydrated = useDocuments((s) => s.hydrated);

  if (!hydrated) return null;
  if (id) return <DocumentView key={id} id={id} />;
  return <EmptyState />;
}

function EmptyState() {
  const router = useRouter();
  const create = useDocuments((s) => s.create);
  const { sidebarCollapsed, setSidebarCollapsed } = useUi();

  return (
    <div className="flex h-full flex-col">
      <div className="titlebar flex h-11 shrink-0 items-center px-3">
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="rounded p-1 text-muted hover:bg-hover"
            aria-label="Abrir barra lateral"
          >
            <Menu className="size-5" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-11 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-hover text-4xl font-bold">/</div>
        <h2 className="text-xl font-semibold">Bem-vindo ao Slash</h2>
        <p className="max-w-sm text-sm text-muted">
          Crie sua primeira página para começar a organizar ideias, notas e projetos.
        </p>
        <button
          onClick={() => router.push(`/documents?id=${create()}`)}
          className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          <PlusCircle className="size-4" /> Criar uma página
        </button>
      </div>
    </div>
  );
}
