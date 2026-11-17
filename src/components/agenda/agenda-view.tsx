"use client";

import { ChevronLeft, ChevronRight, Menu, PanelRight, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  addDays,
  addMonths,
  isValidKey,
  periodLabel,
  todayKey,
  weekDays,
  type DateKey,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { usePlanner } from "@/store/planner";
import { useUi } from "@/store/ui";
import { DayPlanner } from "./day-planner";
import { EventEditor, newDraft, type EditorTarget } from "./event-editor";
import { MonthGrid } from "./month-grid";
import { TimeGrid } from "./time-grid";

export type AgendaMode = "day" | "week" | "month";

const MODES: { id: AgendaMode; label: string; key: string }[] = [
  { id: "day", label: "Dia", key: "d" },
  { id: "week", label: "Semana", key: "s" },
  { id: "month", label: "Mês", key: "m" },
];

export function agendaUrl(mode: AgendaMode = "week", date: DateKey = todayKey()) {
  return `/documents?view=agenda&mode=${mode}&date=${date}`;
}

export function AgendaView() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = usePlanner((s) => s.hydrated);
  const { sidebarCollapsed, setSidebarCollapsed } = useUi();
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const modeParam = params.get("mode");
  const mode: AgendaMode = modeParam === "day" || modeParam === "month" ? modeParam : "week";
  const dateParam = params.get("date");
  const date = isValidKey(dateParam) ? dateParam : todayKey();

  const go = (nextMode: AgendaMode, nextDate: DateKey) => router.replace(agendaUrl(nextMode, nextDate));
  const step = (direction: 1 | -1) =>
    go(mode, mode === "month" ? addMonths(date, direction) : addDays(date, direction * (mode === "week" ? 7 : 1)));

  // Atalhos: T = hoje, D/S/M = visão, ← → = período anterior/próximo, N = novo evento.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editor || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true]")) return;
      const key = e.key.toLowerCase();
      const modeKey = MODES.find((m) => m.key === key);
      if (key === "t") go(mode, todayKey());
      else if (modeKey) go(modeKey.id, date);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (key === "n") setEditor({ draft: newDraft(date) });
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!hydrated) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="titlebar flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="rounded p-1 text-muted hover:bg-hover"
            aria-label="Abrir barra lateral"
          >
            <Menu className="size-5" />
          </button>
        )}
        <button
          onClick={() => go(mode, todayKey())}
          title="Hoje (T)"
          className="rounded-md border border-border px-3 py-1 text-sm hover:bg-hover"
        >
          Hoje
        </button>
        <div className="flex">
          <button onClick={() => step(-1)} className="rounded p-1 text-muted hover:bg-hover" aria-label="Anterior">
            <ChevronLeft className="size-5" />
          </button>
          <button onClick={() => step(1)} className="rounded p-1 text-muted hover:bg-hover" aria-label="Próximo">
            <ChevronRight className="size-5" />
          </button>
        </div>
        <h1 className="min-w-0 truncate text-base font-semibold">{periodLabel(date, mode)}</h1>

        <div className="flex-1" />

        <div className="flex rounded-md bg-hover p-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => go(m.id, date)}
              title={`${m.label} (${m.key.toUpperCase()})`}
              className={cn(
                "rounded px-2.5 py-0.5 text-sm",
                mode === m.id ? "bg-background font-medium shadow-sm" : "text-muted hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditor({ draft: newDraft(date) })}
          title="Novo evento (N)"
          className="flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-sm font-medium text-background hover:opacity-90"
        >
          <Plus className="size-4" /> Evento
        </button>
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className={cn("rounded p-1 hover:bg-hover", panelOpen ? "text-foreground" : "text-muted")}
          aria-label={panelOpen ? "Esconder planejamento" : "Mostrar planejamento"}
          title={panelOpen ? "Esconder planejamento" : "Mostrar planejamento"}
        >
          <PanelRight className="size-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {mode === "month" ? (
          <MonthGrid
            date={date}
            selected={date}
            onSelect={(day) => go("month", day)}
            onOpenDay={(day) => go("day", day)}
            onOpen={setEditor}
          />
        ) : (
          <TimeGrid
            days={mode === "week" ? weekDays(date) : [date]}
            selected={date}
            onOpen={setEditor}
            onDayClick={(day) => go(mode === "week" && day === date ? "day" : mode, day)}
          />
        )}
        {panelOpen && <DayPlanner date={date} onOpen={setEditor} />}
      </div>

      <EventEditor target={editor} onClose={() => setEditor(null)} />
    </div>
  );
}
