import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex size-7 items-center justify-center rounded-md bg-foreground font-bold text-background">/</div>
          Slash
        </div>
        <Link href="/documents" className="rounded-md px-3 py-1.5 text-sm hover:bg-hover">
          Entrar
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-24 text-center">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Suas ideias, documentos e planos. Num só lugar.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          O Slash é o espaço de trabalho conectado onde tudo fica mais rápido e organizado. Aperte <kbd className="rounded border border-border px-1.5 font-mono">Ctrl</kbd> + <kbd className="rounded border border-border px-1.5 font-mono">Espaço</kbd> e comece.
        </p>
        <Link
          href="/documents"
          className="flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 font-medium text-background hover:opacity-90"
        >
          Começar a escrever <ArrowRight className="size-4" />
        </Link>
      </main>
    </div>
  );
}
