"use client";

import { AlignLeft, CheckSquare, Clock, MapPin, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { formatTime, longDate, parseTime, type DateKey } from "@/lib/dates";
import { TAG_COLORS } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { usePlanner, type CalendarEvent } from "@/store/planner";

export type EventDraft = Omit<CalendarEvent, "id" | "createdAt">;

/** O que está aberto no editor: um evento existente (id) ou um rascunho novo. */
export type EditorTarget = { id: string } | { draft: EventDraft };

export function newDraft(date: DateKey, start = 9 * 60, end = start + 60): EventDraft {
  return { title: "", date, start, end: Math.min(end, 24 * 60), allDay: false, color: "blue" };
}

export function EventEditor({ target, onClose }: { target: EditorTarget | null; onClose: () => void }) {
  return (
    <Modal open={!!target} onClose={onClose} className="max-w-md">
      {target && <EditorForm key={"id" in target ? target.id : "novo"} target={target} onClose={onClose} />}
    </Modal>
  );
}

function EditorForm({ target, onClose }: { target: EditorTarget; onClose: () => void }) {
  const { createEvent, updateEvent, deleteEvent } = usePlanner();
  const existing = usePlanner((s) => ("id" in target ? s.events[target.id] : undefined));
  const task = usePlanner((s) => (existing?.taskId ? s.tasks[existing.taskId] : undefined));
  const initial: EventDraft | undefined = "draft" in target ? target.draft : existing;

  const [form, setForm] = useState<EventDraft | undefined>(initial);
  const [startText, setStartText] = useState(initial ? formatTime(initial.start) : "");
  const [endText, setEndText] = useState(initial ? formatTime(initial.end) : "");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => titleRef.current?.focus(), []);

  if (!form) return null;
  const patch = (p: Partial<EventDraft>) => setForm((f) => (f ? { ...f, ...p } : f));

  const start = parseTime(startText);
  const end = parseTime(endText);
  const timeError = !form.allDay && (start === null || end === null || end <= start);

  const save = () => {
    if (timeError) return;
    const data: EventDraft = {
      ...form,
      title: form.title.trim(),
      location: form.location?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      start: form.allDay ? 0 : start!,
      end: form.allDay ? 24 * 60 : end!,
    };
    if ("id" in target) updateEvent(target.id, data);
    else createEvent(data);
    onClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col"
    >
      <div className="px-5 pt-5 pb-3">
        <input
          ref={titleRef}
          value={form.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder={task ? "Tarefa" : "Adicionar título"}
          className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted/60"
        />
        {task && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <CheckSquare className="size-3.5" /> Bloco de horário da tarefa
            {task.done && " (concluída)"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 px-5 pb-4 text-sm">
        <Row icon={<Clock />}>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => e.target.value && patch({ date: e.target.value })}
              className="rounded-md bg-hover px-2 py-1 outline-none"
            />
            {!form.allDay && (
              <>
                <input
                  type="time"
                  step={300}
                  value={startText}
                  onChange={(e) => {
                    const next = parseTime(e.target.value);
                    // Mudar o início empurra o fim junto, mantendo a duração.
                    if (next !== null && start !== null && end !== null) {
                      setEndText(formatTime(Math.min(24 * 60 - 5, next + (end - start))));
                    }
                    setStartText(e.target.value);
                  }}
                  className="rounded-md bg-hover px-2 py-1 outline-none"
                />
                <span className="text-muted">–</span>
                <input
                  type="time"
                  step={300}
                  value={endText}
                  onChange={(e) => setEndText(e.target.value)}
                  className={cn("rounded-md bg-hover px-2 py-1 outline-none", timeError && "ring-1 ring-red-500")}
                />
              </>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted">{longDate(form.date)}</span>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => patch({ allDay: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              Dia inteiro
            </label>
          </div>
          {timeError && <p className="mt-1 text-xs text-red-500">O fim precisa ser depois do início.</p>}
        </Row>

        <Row icon={<MapPin />}>
          <input
            value={form.location ?? ""}
            onChange={(e) => patch({ location: e.target.value })}
            placeholder="Adicionar local"
            className="w-full bg-transparent py-1 outline-none placeholder:text-muted/60"
          />
        </Row>

        <Row icon={<AlignLeft />}>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Adicionar descrição"
            rows={3}
            className="w-full resize-none bg-transparent py-1 outline-none placeholder:text-muted/60"
          />
        </Row>

        <div className="flex items-center gap-1.5 pl-7">
          {TAG_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.name}
              aria-label={c.name}
              onClick={() => patch({ color: c.id })}
              style={{ background: c.value }}
              className={cn(
                "size-5 rounded-full transition",
                form.color === c.id ? "ring-2 ring-foreground/60 ring-offset-2 ring-offset-background" : "hover:scale-110",
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-sidebar px-5 py-3">
        {"id" in target && (
          <button
            type="button"
            onClick={() => {
              deleteEvent(target.id);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-hover hover:text-red-500"
          >
            <Trash2 className="size-4" /> Excluir
          </button>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm hover:bg-hover">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={timeError}
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-1.5 flex text-muted [&>svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
