"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { ACCENTS, useSettings, type ThemeChoice } from "@/store/settings";

/** Aplica as configurações de aparência e do editor na página (atributos no <html>, lidos pelo CSS). */
export function SettingsApplier() {
  const { hydrated, theme, accent, font, fontSize, fullWidth, spellcheck, set } = useSettings();
  const { theme: activeTheme, setTheme } = useTheme();

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.dataset.font = font;
    root.dataset.fontSize = fontSize;
    if (fullWidth) root.dataset.fullWidth = "";
    else delete root.dataset.fullWidth;
    const color = ACCENTS.find((a) => a.id === accent)?.value;
    if (color) root.style.setProperty("--accent", color);
    else root.style.removeProperty("--accent");
  }, [hydrated, accent, font, fontSize, fullWidth]);

  useEffect(() => {
    if (hydrated) window.slash?.setSpellcheck(spellcheck);
  }, [hydrated, spellcheck]);

  // O tema salvo nas configurações vale mais que o do localStorage (que fica para trás se a pasta de dados mudar).
  useEffect(() => {
    if (!hydrated || !activeTheme) return;
    if (theme === null) set({ theme: activeTheme as ThemeChoice });
    else if (theme !== activeTheme) setTheme(theme);
  }, [hydrated, theme, activeTheme, set, setTheme]);

  return null;
}
