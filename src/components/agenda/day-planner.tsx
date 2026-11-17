"use client";

import { ArrowRight, CalendarClock, ChevronRight, Flag, GripVertical, Inbox, NotebookPen, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { DRAG_TASK } from "@/lib/dnd";
import { formatTime, longDate, shortDate, todayKey, type DateKey } from "@/lib/dates";
import { tagColorValue } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { useDocuments } from "@/store/documents";
import { sortEvents, sortTasks, usePlanner, type Priority, type Task } from "@/store/planner";
import type { EditorTarget } from "./event-editor";
import { eventTitle } from "./event-style";

const PRIORITIES: Record<Priority, { label: string; className: string }> = {
  0: { label: "Sem prioridade", className: "text-muted/50" },
  1: { label: "Prioridade baixa", className: "text-sky-500" },
  2: { label: "Prioridade média", className: "text-amber-500" },
  3: { label: "Prioridade alta", className: "text-red-500" },
};

/** Painel lateral da agenda: nota do dia, compromissos e tarefas da data selecionada. */
export function DayPlanner({ date, onOpen }: { date: DateKey; onOpen: (target: EditorTarget) => void }) {
  const router = useRouter();
  const events = usePlanner((s) => s.events);
  const tasks = usePlanner((s) => s.tasks);
  const noteId = usePlanner((s) => s.dailyNotes[date]);
  const { createTask, updateTask, openDailyNote } = usePlanner();
  const note = useDocuments((s) => (noteId ? s.docs[noteId] : undefined));
  const [inboxOpen, setInboxOpen] = useState(false);
  const today = todayKey();
  const isToday = date === today;

  const all = Object.values(tasks);
  const dayTasks = sortTasks(all.filter((t) => t.date === date));
  // O que ficou para trás aparece no planejamento de hoje até ser concluído ou remarcado.
  const overdue = isToday ? sortTasks(all.filter((t) => t.date && t.date < today && !t.done)) : [];
  const inbox = sortTasks(all.filter((t) => !t.date && !t.done));
  const dayEvents = sortEvents(Object.values(events).filter((e) => e.date === date && !e.taskId));
  const done = dayTasks.filter((t) => t.done).length;

  const hasNote = note && !note.isArchived;

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-sidebar/50">
      <div className="px-4 pt-4 pb-3">
        <p className="text-xs font-medium text-muted">{isToday ? "Hoje" : "Planejamento"}</p>
        <h2 className="text-base font-semibold">{longDate(date)}</h2>
      </div>

      <div className="px-3">
        <button
          onClick={() => router.push(`/documents?id=${openDailyNote(date)}`)}
          className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-hover"
        >
          <NotebookPen className="size-4 text-muted" />
          <span className="flex-1">{hasNote ? "Abrir nota do dia" : "Criar nota do dia"}</span>
          <ChevronRight className="size-4 text-muted" />
        </button>
      </div>

      {dayEvents.length > 0 && (
        <Section title="Compromissos">
          {dayEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onOpen({ id: event.id })}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-hover"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: tagColorValue(event.color) }} />
              <span className="w-24 shrink-0 text-xs text-muted tabular-nums">
                {event.allDay ? "Dia inteiro" : `${formatTime(event.start)} – ${formatTime(event.end)}`}
              </span>
              <span className="truncate">{eventTitle(event.title)}</span>
            </button>
          ))}
        </Section>
      )}

      <Section
        title="Tarefas"
        extra={dayTasks.length > 0 && <span className="text-[11px] text-muted">{done}/{dayTasks.length}</span>}
      >
        {dayTasks.length > 0 && (
          <div className="mx-2 mb-1.5 h-1 overflow-hidden rounded-full bg-hover">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done / dayTasks.length) * 100}%` }} />
          </div>
        )}
        {dayTasks.map((task) => (
          <TaskRow key={`${task.id}:${task.title}`} task={task} />
        ))}
        <NewTask onCreate={(title) => createTask(title, date)} />
        {dayTasks.length === 0 && (
          <p className="px-2 pt-1 text-xs text-muted">
            Arraste uma tarefa para a agenda para reservar um horário para ela.
          </p>
        )}
      </Section>

      {overdue.length > 0 && (
        <Section
          title="Atrasadas"
          extra={
            <button
              onClick={() => overdue.forEach((t) => updateTask(t.id, { date: today }))}
              className="flex items-center gap-1 rounded px-1 text-[11px] text-muted hover:bg-hover hover:text-foreground"
            >
              Trazer para hoje <ArrowRight className="size-3" />
            </button>
          }
        >
          {overdue.map((task) => (
            <TaskRow key={`${task.id}:${task.title}`} task={task} hint={shortDate(task.date!)} />
          ))}
        </Section>
      )}

      <div className="mt-auto border-t border-border px-2 py-2">
        <button
          onClick={() => setInboxOpen(!inboxOpen)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-hover"
        >
          <Inbox className="size-3.5" />
          <span className="flex-1 text-left">Caixa de entrada</span>
          {inbox.length > 0 && <span>{inbox.length}</span>}
          <ChevronRight className={cn("size-3.5 transition", inboxOpen && "rotate-90")} />
        </button>
        {inboxOpen && (
          <div className="pt-1">
            {inbox.map((task) => (
              <TaskRow key={`${task.id}:${task.title}`} task={task} />
            ))}
            <NewTask onCreate={(title) => createTask(title, null)} placeholder="Tarefa sem data" />
          </div>
        )}
      </div>
    </aside>
  );
}

function Section({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-2 pt-4">
      <div className="flex items-center px-2 pb-1">
        <span className="flex-1 text-xs font-medium text-muted">{title}</span>
        {extra}
      </div>
      {children}
    </div>
  );
}

function TaskRow({ task, hint }: { task: Task; hint?: string }) {
  const { toggleTask, updateTask, deleteTask } = usePlanner();
  const events = usePlanner((s) => s.events);
  const blocks = Object.values(events).filter((e) => e.taskId === task.id);
  const [title, setTitle] = useState(task.title);
  const priority = PRIORITIES[task.priority];

  const commit = () => {
    const next = title.trim();
    if (!next) setTitle(task.title);
    else if (next !== task.title) updateTask(task.id, { title: next });
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TASK, task.id);
        e.dataTransfer.effectAllowed = "copyMove";
      }}
      className="group/task flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-hover"
    >
      <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted opacity-0 group-hover/task:opacity-60" />
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => toggleTask(task.id)}
        className="size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
        aria-label={task.done ? "Marcar como não concluída" : "Concluir tarefa"}
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setTitle(task.title);
            setTimeout(() => (document.activeElement as HTMLElement | null)?.blur());
          }
        }}
        className={cn(
          "min-w-0 flex-1 bg-transparent py-0.5 text-sm outline-none",
          task.done && "text-muted line-through",
        )}
      />
      {hint && <span className="shrink-0 text-[11px] text-red-500/80">{hint}</span>}
      {blocks.length > 0 && (
        <span title={blocks.map((b) => `${shortDate(b.date)} ${formatTime(b.start)}`).join(", ")}>
          <CalendarClock className="size-3.5 shrink-0 text-muted" />
        </span>
      )}
      <button
        onClick={() => updateTask(task.id, { priority: ((task.priority + 1) % 4) as Priority })}
        title={`${priority.label} (clique para mudar)`}
        aria-label={priority.label}
        className={cn(
          "shrink-0 rounded p-0.5 hover:bg-hover",
          priority.className,
          task.priority === 0 && "opacity-0 group-hover/task:opacity-100",
        )}
      >
        <Flag className="size-3.5" fill={task.priority > 0 ? "currentColor" : "none"} />
      </button>
      <button
        onClick={() => deleteTask(task.id)}
        aria-label="Excluir tarefa"
        className="shrink-0 rounded p-0.5 text-muted opacity-0 group-hover/task:opacity-100 hover:bg-hover hover:text-red-500"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function NewTask({ onCreate, placeholder = "Adicionar tarefa" }: { onCreate: (title: string) => void; placeholder?: string }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onCreate(value.trim());
        setValue("");
      }}
      className="flex items-center gap-2 rounded-md px-2 py-1 text-muted focus-within:text-foreground"
    >
      <Plus className="size-4 shrink-0" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
      />
    </form>
  );
}
