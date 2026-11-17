"use client";

import {
  Archive,
  FolderOpen,
  HardDrive,
  Info,
  Keyboard,
  KeyRound,
  Lock,
  Monitor,
  Moon,
  Palette,
  PenLine,
  RefreshCw,
  RotateCw,
  Sparkles,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { AI_MODELS, aiBridge } from "@/lib/ai";
import { useLock } from "@/lib/lock";
import { flushPageContent } from "@/lib/page-content";
import { installUpdate, useUpdateStatus } from "@/lib/use-update-status";
import { cn } from "@/lib/utils";
import { useDocuments } from "@/store/documents";
import { ACCENTS, useSettings, type ThemeChoice } from "@/store/settings";
import { useUi } from "@/store/ui";

type SectionId = "appearance" | "editor" | "ai" | "security" | "storage" | "shortcuts" | "about";

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "appearance", label: "Aparência", icon: Palette },
  { id: "editor", label: "Editor", icon: PenLine },
  { id: "ai", label: "Assistente IA", icon: Sparkles },
  { id: "security", label: "Segurança", icon: Lock },
  { id: "storage", label: "Armazenamento", icon: HardDrive },
  { id: "shortcuts", label: "Atalhos", icon: Keyboard },
  { id: "about", label: "Sobre", icon: Info },
];

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen } = useUi();
  const requestedSection = useUi((s) => s.settingsSection);
  const [section, setSection] = useState<SectionId>("appearance");

  // Aberto apontando para uma seção (ex.: "Configurar chave" no assistente).
  const [handledRequest, setHandledRequest] = useState<string | null>(null);
  const request = settingsOpen ? requestedSection : null;
  if (request !== handledRequest) {
    setHandledRequest(request);
    if (request && SECTIONS.some((s) => s.id === request)) setSection(request as SectionId);
  }

  // Ctrl+, abre e fecha as configurações.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "," && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSettingsOpen(!useUi.getState().settingsOpen);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setSettingsOpen]);

  const current = SECTIONS.find((s) => s.id === section)!;

  return (
    <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} className="flex h-[min(620px,80vh)] max-w-3xl">
      <nav className="flex w-48 shrink-0 flex-col gap-0.5 bg-sidebar p-2">
        <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted">Configurações</p>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm text-foreground/75 hover:bg-hover",
              section === id && "bg-hover font-medium text-foreground",
            )}
          >
            <Icon className="size-4 text-muted" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-border px-6 py-3.5">
          <h2 className="flex-1 font-semibold">{current.label}</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="rounded p-1 text-muted hover:bg-hover"
            aria-label="Fechar configurações"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {section === "appearance" && <AppearanceSection />}
          {section === "editor" && <EditorSection />}
          {section === "ai" && <AiSection />}
          {section === "security" && <SecuritySection />}
          {section === "storage" && <StorageSection />}
          {section === "shortcuts" && <ShortcutsSection />}
          {section === "about" && <AboutSection />}
        </div>
      </div>
    </Modal>
  );
}

// ---------- Seções ----------

const THEMES: { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const settings = useSettings();

  return (
    <>
      <Row title="Tema" description="Como o Slash aparece neste computador.">
        <Segmented
          value={theme as ThemeChoice}
          options={THEMES.map(({ value, label, icon: Icon }) => ({
            value,
            label: (
              <span className="flex items-center gap-1.5">
                <Icon className="size-3.5" /> {label}
              </span>
            ),
          }))}
          onChange={(value) => {
            setTheme(value);
            settings.set({ theme: value });
          }}
        />
      </Row>

      <Row title="Cor de destaque" description="Usada em links, seleções e botões principais.">
        <div className="flex gap-1.5">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => settings.set({ accent: a.id })}
              title={a.name}
              aria-label={a.name}
              className={cn(
                "size-6 rounded-full ring-offset-2 ring-offset-background transition",
                settings.accent === a.id ? "ring-2 ring-foreground/60" : "hover:scale-110",
              )}
              style={{ background: a.value ?? "#2383e2" }}
            />
          ))}
        </div>
      </Row>

      <Row title="Fonte" description="Fonte do título e do texto das páginas.">
        <Segmented
          value={settings.font}
          options={[
            { value: "sans", label: <span>Padrão</span> },
            { value: "serif", label: <span className="font-serif">Serifa</span> },
            { value: "mono", label: <span className="font-mono">Mono</span> },
          ]}
          onChange={(font) => settings.set({ font })}
        />
      </Row>

      <Row title="Tamanho do texto" description="Tamanho do texto dentro das páginas.">
        <Segmented
          value={settings.fontSize}
          options={[
            { value: "small", label: <span className="text-xs">Pequeno</span> },
            { value: "normal", label: <span>Normal</span> },
            { value: "large", label: <span className="text-[15px]">Grande</span> },
          ]}
          onChange={(fontSize) => settings.set({ fontSize })}
        />
      </Row>

      <Row title="Largura total" description="Usa toda a largura da janela em vez de uma coluna centralizada.">
        <Toggle checked={settings.fullWidth} onChange={(fullWidth) => settings.set({ fullWidth })} />
      </Row>
    </>
  );
}

function EditorSection() {
  const settings = useSettings();
  const desktop = typeof window !== "undefined" && Boolean(window.slash);

  return (
    <>
      <Row title="Ao abrir o Slash" description="Qual tela aparece quando você abre o app.">
        <Segmented
          value={settings.startPage}
          options={[
            { value: "last", label: <span>Última página</span> },
            { value: "home", label: <span>Tela inicial</span> },
          ]}
          onChange={(startPage) => settings.set({ startPage })}
        />
      </Row>

      <Row
        title="Correção ortográfica"
        description={
          desktop
            ? "Sublinha palavras com erro. Clique com o botão direito para ver sugestões."
            : "Disponível no app para desktop."
        }
      >
        <Toggle
          checked={settings.spellcheck}
          disabled={!desktop}
          onChange={(spellcheck) => settings.set({ spellcheck })}
        />
      </Row>
    </>
  );
}

function AiSection() {
  const bridge = aiBridge();
  const model = useSettings((s) => s.aiModel);
  const setSettings = useSettings((s) => s.set);
  const [status, setStatus] = useState<{ hasKey: boolean; encryptionAvailable: boolean } | null>(null);
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bridge?.status().then(setStatus);
  }, [bridge]);

  if (!bridge) {
    return <p className="py-6 text-sm text-muted">Disponível no app para desktop.</p>;
  }

  const save = async () => {
    setSaving(true);
    try {
      await bridge.setKey(key, model);
      setKey("");
      setStatus(await bridge.status());
      toast.success("Chave do Gemini salva");
    } catch (error) {
      toast.error(ipcMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="border-b border-border py-4">
        <p className="text-sm font-medium">Chave de API do Google Gemini</p>
        <p className="mt-0.5 text-xs text-muted">
          {status?.hasKey
            ? "Conectado. A chave fica guardada criptografada neste computador."
            : "Crie uma chave no Google AI Studio e cole aqui. O uso é cobrado (ou limitado) na sua conta Google."}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && key.trim() && !saving && void save()}
            placeholder={status?.hasKey ? "Colar uma nova chave para trocar" : "Cole a chave aqui"}
            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
          <Button onClick={() => void save()} disabled={!key.trim() || saving} primary>
            {saving ? "Testando..." : "Salvar"}
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Criar chave no Google AI Studio
          </a>
          {status?.hasKey && (
            <button
              onClick={async () => {
                await bridge.clearKey();
                setStatus(await bridge.status());
                toast("Chave removida");
              }}
              className="text-muted hover:text-red-500"
            >
              Remover chave
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-border py-4">
        <p className="text-sm font-medium">Modelo</p>
        <p className="mt-0.5 text-xs text-muted">Modelos mais fortes respondem melhor, mas são mais lentos e caros.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {AI_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSettings({ aiModel: m.id })}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition",
                model === m.id ? "border-accent bg-accent/5" : "border-border hover:bg-hover",
              )}
            >
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-xs text-muted">{m.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <p className="py-4 text-xs text-muted">
        Ao usar o assistente, o texto das suas páginas é enviado ao Google para gerar a resposta,{" "}
        <strong>inclusive o das páginas protegidas com senha</strong>. Use <strong>Ctrl+J</strong> para abrir o
        assistente, ou <strong>Resumir com IA</strong> no menu <strong>…</strong> de uma página.
      </p>
    </>
  );
}

function SecuritySection() {
  const hasPassword = useSettings((s) => Boolean(s.lockHash && s.lockSalt));
  const unlocked = useLock((s) => s.unlocked);
  const docs = useDocuments((s) => s.docs);
  const setPasswordDialog = useUi((s) => s.setPasswordDialog);
  const protectedCount = Object.values(docs).filter((d) => d.isLocked && !d.isArchived).length;

  return (
    <>
      <Row
        title="Senha mestra"
        description={
          hasPassword
            ? "Pedida para abrir qualquer página protegida."
            : "Crie uma senha para poder proteger páginas. Também é criada na primeira vez que você protege uma página."
        }
      >
        <Button
          onClick={() => setPasswordDialog({ mode: hasPassword ? "change" : "create" })}
          icon={<KeyRound />}
          primary={!hasPassword}
        >
          {hasPassword ? "Alterar senha" : "Criar senha"}
        </Button>
      </Row>

      {hasPassword && (
        <Row
          title="Páginas protegidas"
          description={
            unlocked
              ? "Desbloqueadas agora. Voltam a bloquear após 5 minutos sem uso."
              : "Bloqueadas. A senha é pedida ao abrir cada uma."
          }
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted tabular-nums">{protectedCount}</span>
            <Button onClick={() => useLock.getState().lock()} disabled={!unlocked} icon={<Lock />}>
              Bloquear agora
            </Button>
          </div>
        </Row>
      )}

      <p className="py-4 text-xs text-muted">
        Para proteger uma página, abra o menu <strong>…</strong> dela (no topo da página ou na barra lateral) e escolha{" "}
        <strong>Proteger com senha</strong>. A proteção impede que outras pessoas vejam a página pelo Slash; os
        arquivos na pasta de dados não são criptografados.
      </p>
    </>
  );
}

function StorageSection() {
  const slash = typeof window !== "undefined" ? window.slash : undefined;
  const [info, setInfo] = useState<SlashAppInfo | null>(null);
  const [stats, setStats] = useState<SlashDataStats | null>(null);
  const [moving, setMoving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    slash?.info().then(setInfo);
    slash?.data.stats().then(setStats);
  }, [slash]);

  if (!slash) {
    return (
      <p className="py-6 text-sm text-muted">
        Disponível no app para desktop. No navegador, os dados ficam guardados no próprio navegador.
      </p>
    );
  }

  const fromEnv = info?.dataDirSource === "env";

  const onChangeFolder = async () => {
    if (!info) return;
    const dir = await slash.data.chooseFolder("Escolha a nova pasta de dados do Slash");
    if (!dir) return;
    const check = await slash.data.inspect(dir);
    if (check.isCurrent) return toast("Essa já é a pasta atual");
    if (check.insideCurrent) return toast.error("Escolha uma pasta fora da pasta de dados atual");

    const mode = check.hasData ? "use" : "copy";
    const message = check.hasData
      ? `Essa pasta já tem dados do Slash.\n\nO app vai reiniciar usando os dados que estão lá. Seus dados atuais continuam guardados em:\n${info.dataDir}`
      : `Seus dados serão copiados para:\n${dir}\n\nO app reinicia em seguida. A pasta atual não é apagada.`;
    if (!confirm(message)) return;

    setMoving(true);
    flushPageContent();
    try {
      await slash.data.change(dir, mode);
    } catch (error) {
      setMoving(false);
      toast.error(`Não foi possível mudar o local: ${ipcMessage(error)}`);
    }
  };

  const onBackup = async () => {
    setBackingUp(true);
    flushPageContent();
    try {
      const dest = await slash.data.backup();
      if (dest) {
        toast.success("Backup criado", {
          description: dest,
          action: { label: "Abrir", onClick: () => slash.data.openBackup(dest) },
        });
      }
    } catch (error) {
      toast.error(`Não foi possível criar o backup: ${ipcMessage(error)}`);
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <>
      <div className="border-b border-border py-4">
        <p className="text-sm font-medium">Pasta de dados</p>
        <p className="mt-0.5 text-xs text-muted">Onde ficam suas páginas, anexos e configurações.</p>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-hover px-3 py-2">
          <HardDrive className="size-4 shrink-0 text-muted" />
          <code className="min-w-0 flex-1 truncate text-xs select-all" title={info?.dataDir}>
            {info?.dataDir ?? "..."}
          </code>
        </div>
        {fromEnv && (
          <p className="mt-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            O local está definido pela variável de ambiente SLASH_DATA_DIR. Para mudar por aqui, abra o app sem essa variável.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => slash.data.openFolder()} icon={<FolderOpen />}>
            Abrir pasta
          </Button>
          <Button onClick={onChangeFolder} disabled={fromEnv || !info} primary>
            Mudar local...
          </Button>
        </div>
      </div>

      <div className="border-b border-border py-4">
        <p className="text-sm font-medium">Uso de espaço</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Páginas" value={stats ? String(stats.pages) : "..."} detail={stats ? formatBytes(stats.pagesBytes) : ""} />
          <Stat label="Anexos" value={stats ? String(stats.files) : "..."} detail={stats ? formatBytes(stats.filesBytes) : ""} />
          <Stat label="Seus dados" value={stats ? formatBytes(stats.dataBytes) : "..."} detail="sem o cache" />
          <Stat label="Cache do app" value={stats ? formatBytes(stats.cacheBytes) : "..."} detail="recriado se apagado" />
        </div>
      </div>

      <Row title="Backup" description="Cria uma cópia completa dos seus dados numa pasta que você escolher.">
        <Button onClick={onBackup} disabled={backingUp} icon={<Archive />}>
          {backingUp ? "Copiando..." : "Criar backup"}
        </Button>
      </Row>

      {moving && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-background/90 text-center">
          <div className="size-8 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="font-medium">Movendo seus dados...</p>
          <p className="text-sm text-muted">O Slash vai reiniciar sozinho em seguida.</p>
        </div>
      )}
    </>
  );
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl", "K"], label: "Buscar páginas" },
  { keys: ["Ctrl", ","], label: "Abrir as configurações" },
  { keys: ["Ctrl", "J"], label: "Abrir o assistente de IA" },
  { keys: ["Ctrl", "Espaço"], label: "Menu de comandos no editor" },
  { keys: [":", "2 letras"], label: "Inserir emoji" },
  { keys: ["Enter"], label: "No título, pula para o texto" },
  { keys: ["Ctrl", "B"], label: "Negrito" },
  { keys: ["Ctrl", "I"], label: "Itálico" },
  { keys: ["Ctrl", "U"], label: "Sublinhado" },
  { keys: ["Tab"], label: "Recuar bloco" },
  { keys: ["Shift", "Tab"], label: "Desfazer recuo do bloco" },
  { keys: ["Ctrl", "Z"], label: "Desfazer" },
  { keys: ["Ctrl", "Shift", "Z"], label: "Refazer" },
];

function ShortcutsSection() {
  return (
    <div className="py-2">
      {SHORTCUTS.map(({ keys, label }) => (
        <div key={label} className="flex items-center justify-between border-b border-border py-2.5 text-sm">
          <span>{label}</span>
          <span className="flex items-center gap-1">
            {keys.map((k) => (
              <kbd key={k} className="rounded border border-border bg-hover px-1.5 py-0.5 font-sans text-xs text-foreground/80">
                {k}
              </kbd>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function AboutSection() {
  const slash = typeof window !== "undefined" ? window.slash : undefined;
  const [info, setInfo] = useState<SlashAppInfo | null>(null);
  const docs = useDocuments((s) => s.docs);
  const folders = useDocuments((s) => s.folders);
  const tags = useDocuments((s) => s.tags);

  useEffect(() => {
    slash?.info().then(setInfo);
  }, [slash]);

  const active = Object.values(docs).filter((d) => !d.isArchived).length;
  const trashed = Object.values(docs).length - active;

  return (
    <>
      <div className="flex items-center gap-4 border-b border-border py-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- ícone local estático, gerado por scripts/make-icon.mjs */}
        <img src="/icon.png" alt="" width={56} height={56} className="size-14 shrink-0" draggable={false} />
        <div>
          <p className="text-lg font-semibold">Slash</p>
          <p className="text-sm text-muted">Seu espaço de trabalho para notas, docs e ideias.</p>
        </div>
      </div>
      <InfoRow label="Versão" value={info?.version ?? (slash ? "..." : "Navegador")} />
      {slash && <UpdateRow />}
      <InfoRow label="Páginas" value={`${active}${trashed ? ` (+${trashed} na lixeira)` : ""}`} />
      <InfoRow label="Pastas e etiquetas" value={`${Object.keys(folders).length} pastas · ${Object.keys(tags).length} etiquetas`} />
      {slash && (
        <>
          <InfoRow label="Electron" value={slash.versions.electron} />
          <InfoRow label="Chromium" value={slash.versions.chrome} />
          <InfoRow label="Node.js" value={slash.versions.node} />
        </>
      )}
    </>
  );
}

function updateText(status: SlashUpdateStatus | null) {
  switch (status?.state) {
    case "disabled":
      return "Só funciona no app instalado (.exe).";
    case "checking":
      return "Procurando nova versão...";
    case "available":
      return `Versão ${status.version} encontrada, baixando...`;
    case "downloading":
      return `Baixando a versão ${status.version ?? "nova"}... ${status.percent ?? 0}%`;
    case "downloaded":
      return `Versão ${status.version} pronta. Reinicie para instalar.`;
    case "not-available":
      return "Você está na versão mais recente.";
    case "error":
      return status.message ? `Não foi possível verificar: ${status.message}` : "Não foi possível verificar agora.";
    default:
      return "O Slash procura atualizações sozinho e baixa em segundo plano.";
  }
}

function UpdateRow() {
  const status = useUpdateStatus();
  const state = status?.state;
  const busy = state === "checking" || state === "available" || state === "downloading";

  return (
    <Row title="Atualizações" description={updateText(status)}>
      {state === "downloaded" ? (
        <Button onClick={() => installUpdate()} icon={<RotateCw />} primary>
          Reiniciar e atualizar
        </Button>
      ) : (
        <Button onClick={() => window.slash?.updates.check()} disabled={busy || state === "disabled"} icon={<RefreshCw />}>
          Verificar agora
        </Button>
      )}
    </Row>
  );
}

// ---------- Peças ----------

function Row({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-hover p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm text-muted transition",
            value === o.value && "bg-background text-foreground shadow-sm",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 rounded-full transition disabled:opacity-40",
        checked ? "bg-accent" : "bg-foreground/20",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

function Button({
  children,
  onClick,
  icon,
  disabled,
  primary,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:size-4",
        primary ? "bg-accent text-white hover:opacity-90" : "border border-border hover:bg-hover",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
      {detail && <p className="text-[11px] text-muted">{detail}</p>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

/** Tira o prefixo técnico que o Electron põe nas mensagens de erro do IPC. */
function ipcMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
}
