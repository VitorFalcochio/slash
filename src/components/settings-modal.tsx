"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { useUi } from "@/store/ui";

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen } = useUi();
  const { theme, setTheme } = useTheme();

  return (
    <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} className="max-w-md">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold">Configurações</h2>
      </div>
      <div className="space-y-2 px-5 py-4">
        <p className="text-sm font-medium">Aparência</p>
        <p className="text-xs text-muted">Escolha como o Slash aparece neste dispositivo.</p>
        <div className="grid grid-cols-3 gap-2 pt-1">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border border-border py-3 text-sm hover:bg-hover",
                theme === value && "border-accent text-accent",
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
