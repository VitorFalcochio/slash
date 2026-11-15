"use client";

import { useEffect, useRef, useState } from "react";

/** Campo de nome que entra focado e selecionado. Enter ou clicar fora confirma; Esc cancela (devolve ""). */
export function InlineRename({ initial, onDone }: { initial: string; onDone: (name: string) => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const finish = (name: string) => {
    if (done.current) return;
    done.current = true;
    onDone(name.trim());
  };

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(value);
        if (e.key === "Escape") finish("");
      }}
      className="min-w-0 flex-1 rounded border border-accent bg-background px-1 py-0.5 text-sm outline-none"
    />
  );
}
