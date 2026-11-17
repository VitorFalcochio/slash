"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type PopoverProps = {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "right";
  className?: string;
  block?: boolean;
};

// Renderizado em portal com posição fixa, para não ser cortado por containers com rolagem.
export function Popover({ trigger, children, align = "start", side = "bottom", className, block }: PopoverProps) {
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = style !== null;

  const toggle = () => {
    if (open) return setStyle(null);
    const rect = triggerRef.current!.getBoundingClientRect();
    if (side === "right") {
      setStyle({ left: rect.right + 4, bottom: Math.max(8, window.innerHeight - rect.bottom) });
    } else if (align === "end") {
      setStyle({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    } else {
      setStyle({ top: rect.bottom + 4, left: rect.left });
    }
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setStyle(null);
    // Usa o caminho do clique registrado na hora do evento: se o elemento clicado sair da tela durante
    // o clique, `contains(e.target)` daria falso e o painel fecharia sem motivo.
    const onPointer = (e: PointerEvent) => {
      const path = e.composedPath();
      const inside = [panelRef.current, triggerRef.current].some((el) => el && path.includes(el));
      if (!inside) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Mantém o painel dentro da tela: se não couber abaixo do gatilho, abre para cima;
  // se não couber em lugar nenhum, encosta na borda e passa a rolar. Reavalia quando o
  // conteúdo muda de tamanho (ex.: submenus de pastas/etiquetas).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const triggerEl = triggerRef.current;
    if (!open || !panel || !triggerEl) return;
    const M = 8;
    const fit = () => {
      const t = triggerEl.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      panel.style.maxHeight = `${vh - M * 2}px`;
      const h = panel.offsetHeight;
      const w = panel.offsetWidth;

      let top: number;
      if (side === "right") {
        top = t.bottom - h; // alinhado pela base do gatilho
      } else {
        const below = t.bottom + 4;
        const above = t.top - 4 - h;
        top = below + h <= vh - M || above < M ? below : above;
      }
      top = Math.min(Math.max(M, top), vh - M - h);

      let left = side === "right" ? t.right + 4 : align === "end" ? t.right - w : t.left;
      left = Math.min(Math.max(M, left), vw - M - w);

      Object.assign(panel.style, { top: `${top}px`, left: `${left}px`, right: "auto", bottom: "auto" });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [open, side, align]);

  return (
    <div
      ref={triggerRef}
      // O painel fica num portal, mas no React os cliques dentro dele sobem até aqui:
      // sem esta checagem, qualquer clique no painel (ex.: categorias do seletor de emoji) o fecharia.
      onClick={(e) => {
        if (panelRef.current && e.nativeEvent.composedPath().includes(panelRef.current)) return;
        toggle();
      }}
      className={block ? "flex w-full" : "inline-flex"}
    >
      {trigger}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={style}
            className={cn(
              "fixed z-[90] min-w-48 overflow-y-auto rounded-lg border border-border bg-background p-1 text-foreground shadow-xl",
              className,
            )}
          >
            {children(() => setStyle(null))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-hover",
        danger && "hover:text-red-500",
      )}
    >
      {icon && <span className="flex text-muted [&>svg]:size-4">{icon}</span>}
      {children}
    </button>
  );
}
