"use client";

import { Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { unlockWith } from "@/lib/lock";
import { cn } from "@/lib/utils";

/** Mostrado no lugar do conteúdo de uma página protegida enquanto a sessão está bloqueada. */
export function LockScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async () => {
    if (!password || checking) return;
    setChecking(true);
    const ok = await unlockWith(password);
    setChecking(false);
    if (!ok) {
      setError(true);
      setPassword("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center px-6 pt-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-hover">
        <Lock className="size-6 text-muted" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Página protegida</h2>
      <p className="mt-1 max-w-xs text-sm text-muted">Digite a senha mestra para ver o conteúdo.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="mt-5 flex w-full max-w-xs flex-col gap-2"
      >
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder="Senha"
          aria-label="Senha"
          aria-invalid={error}
          className={cn(
            "h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40",
            error && "border-red-500 focus:ring-red-500/30",
          )}
        />
        {error && <p className="text-left text-xs text-red-500">Senha incorreta.</p>}
        <button
          type="submit"
          disabled={!password || checking}
          className="h-9 rounded-md bg-foreground text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          {checking ? "Verificando..." : "Desbloquear"}
        </button>
      </form>
      <p className="mt-4 max-w-xs text-xs text-muted">
        Desbloqueia todas as páginas protegidas. Elas voltam a bloquear após 5 minutos sem uso.
      </p>
    </div>
  );
}
