"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { checkPassword, hashPassword, useLock } from "@/lib/lock";
import { useDocuments } from "@/store/documents";
import { useSettings } from "@/store/settings";
import { useUi } from "@/store/ui";

const MIN_LENGTH = 4;

/** Criar ou trocar a senha mestra das páginas protegidas. */
export function PasswordDialog() {
  const dialog = useUi((s) => s.passwordDialog);
  const setPasswordDialog = useUi((s) => s.setPasswordDialog);
  const close = () => setPasswordDialog(null);

  return (
    <Modal open={!!dialog} onClose={close} className="max-w-sm">
      {dialog && <Form key={dialog.mode} mode={dialog.mode} protectDocId={dialog.protectDocId} onClose={close} />}
    </Modal>
  );
}

function Form({ mode, protectDocId, onClose }: { mode: "create" | "change"; protectDocId?: string; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Qualquer digitação apaga a mensagem de erro.
  const edit = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setError(null);
  };

  const submit = async () => {
    if (next.length < MIN_LENGTH) return setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
    if (next !== confirm) return setError("As senhas não são iguais.");
    setSaving(true);
    if (mode === "change" && !(await checkPassword(current))) {
      setSaving(false);
      return setError("A senha atual está incorreta.");
    }
    useSettings.getState().set(await hashPassword(next));
    useLock.getState().unlock();
    if (protectDocId) useDocuments.getState().update(protectDocId, { isLocked: true });
    toast.success(
      mode === "change" ? "Senha mestra alterada" : protectDocId ? "Senha criada e página protegida" : "Senha mestra criada",
    );
    onClose();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col"
    >
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-hover">
            <KeyRound className="size-5 text-muted" />
          </div>
          <div>
            <h2 className="font-semibold">{mode === "change" ? "Alterar senha mestra" : "Criar senha mestra"}</h2>
            <p className="text-xs text-muted">Uma senha para todas as páginas protegidas.</p>
          </div>
        </div>

        {mode === "change" && (
          <Field label="Senha atual" value={current} onChange={edit(setCurrent)} autoFocus />
        )}
        <Field label="Nova senha" value={next} onChange={edit(setNext)} autoFocus={mode === "create"} />
        <Field label="Confirmar nova senha" value={confirm} onChange={edit(setConfirm)} />

        {error && <p className="text-xs text-red-500">{error}</p>}

        {mode === "create" && (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            Guarde bem esta senha: ela é pedida para abrir qualquer página protegida.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border bg-sidebar px-5 py-3">
        <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm hover:bg-hover">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !next || !confirm || (mode === "change" && !current)}
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
      {label}
      <input
        type="password"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-accent/40"
      />
    </label>
  );
}
