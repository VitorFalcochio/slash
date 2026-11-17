"use client";

import { useState } from "react";
import { DRAG_TASK, dragHas } from "@/lib/dnd";
import { formatTime, fromKey, monthWeeks, sameMonth, todayKey, weekdayName, type DateKey } from "@/lib/dates";
import { tagColorValue } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { sortEvents, usePlanner } from "@/store/planner";
import type { EditorTarget } from "./event-editor";
import { eventStyle, eventTitle } from "./event-style";

const MAX_PER_DAY = 3;

type Props = {
  date: DateKey;
  selected: DateKey;
  onSelect: (day: DateKey) => void;
  onOpenDay: (day: DateKey) => void;
  onOpen: (target: EditorTarget) => void;
};

/** Visão Mês: clique seleciona o dia (o painel ao lado mostra o planejamento), duplo clique abre o dia. */
export function MonthGrid({ date, selected, onSelect, onOpenDay, onOpen }: Props) {
  const events = usePlanner((s) => s.events);
  const tasks = usePlanner((s) => s.tasks);
  const updateTask = usePlanner((s) => s.updateTask);
  const [dropDay, setDropDay] = useState<DateKey | null>(null);
  const weeks = monthWeeks(date);
  const today = todayKey();

  const byDay = new Map<DateKey, ReturnType<typeof sortEvents>>();
  for (const event of sortEvents(Object.values(events))) {
    byDay.set(event.date, [...(byDay.get(event.date) ?? []), event]);
  }
  const openTasks = new Map<DateKey, number>();
  for (const task of Object.values(tasks)) {
    if (task.date && !task.done) openTasks.set(task.date, (openTasks.get(task.date) ?? 0) + 1);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b border-border">
        {weeks[0].map((day) => (
          <span key={day} className="py-2 text-center text-[11px] font-medium text-muted uppercase">
            {weekdayName(day)}
          </span>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7">
        {weeks.flat().map((day) => {
          const list = byDay.get(day) ?? [];
          const pending = openTasks.get(day) ?? 0;
          const inMonth = sameMonth(day, date);
          return (
            <div
              key={day}
              onClick={() => onSelect(day)}
              onDoubleClick={() => onOpenDay(day)}
              // Arrastar uma tarefa para um dia do mês muda a data dela (sem reservar horário).
              onDragOver={(e) => {
                if (!dragHas(e, DRAG_TASK)) return;
                e.preventDefault();
                setDropDay(day);
              }}
              onDragLeave={() => setDropDay(null)}
              onDrop={(e) => {
                setDropDay(null);
                const taskId = e.dataTransfer.getData(DRAG_TASK);
                if (taskId) updateTask(taskId, { date: day });
              }}
              className={cn(
                "flex min-h-0 cursor-pointer flex-col gap-0.5 overflow-hidden border-r border-b border-border p-1 select-none",
                !inMonth && "bg-sidebar/60",
                day === selected && "bg-accent/[0.07]",
                dropDay === day && "ring-2 ring-accent ring-inset",
              )}
            >
              <div className="flex items-center justify-between px-0.5">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    !inMonth && "text-muted/60",
                    day === today && "bg-accent font-semibold text-white",
                  )}
                >
                  {fromKey(day).getDate()}
                </span>
                {pending > 0 && (
                  <span className="text-[10px] text-muted" title={`${pending} tarefa(s) pendente(s)`}>
                    ☐ {pending}
                  </span>
                )}
              </div>
              {list.slice(0, MAX_PER_DAY).map((event) =>
                event.allDay ? (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen({ id: event.id });
                    }}
                    style={eventStyle(event.color)}
                    className="truncate rounded px-1 text-left text-[11px] font-medium"
                  >
                    {eventTitle(event.title)}
                  </button>
                ) : (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen({ id: event.id });
                    }}
                    className="flex items-center gap-1 truncate rounded px-1 text-left text-[11px] hover:bg-hover"
                  >
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: tagColorValue(event.color) }} />
                    <span className="text-muted tabular-nums">{formatTime(event.start)}</span>
                    <span className="truncate">{eventTitle(event.title)}</span>
                  </button>
                ),
              )}
              {list.length > MAX_PER_DAY && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDay(day);
                  }}
                  className="px-1 text-left text-[11px] text-muted hover:text-foreground"
                >
                  +{list.length - MAX_PER_DAY} mais
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
