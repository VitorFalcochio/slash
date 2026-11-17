// Tipos usados no arrastar e soltar da barra lateral.
export const DRAG_DOC = "application/x-slash-doc";
export const DRAG_FOLDER = "application/x-slash-folder";
/** Tarefa do planejamento sendo arrastada para a agenda (vira um bloco de horário). */
export const DRAG_TASK = "application/x-slash-task";

export function dragHas(e: React.DragEvent, type: string) {
  return e.dataTransfer.types.includes(type);
}
