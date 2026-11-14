"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

// Integra a página com a janela nativa: marca o ambiente Electron (para o CSS da barra de título)
// e mantém as cores dos botões nativos da janela iguais ao tema.
export function ElectronBridge() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (window.slash) document.documentElement.dataset.electron = window.slash.platform;
  }, []);

  useEffect(() => {
    if (resolvedTheme === "light" || resolvedTheme === "dark") window.slash?.setTheme(resolvedTheme);
  }, [resolvedTheme]);

  return null;
}
