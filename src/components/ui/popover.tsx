"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
              "fixed z-[90] min-w-48 rounded-lg border border-border bg-background p-1 text-foreground shadow-xl",
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
