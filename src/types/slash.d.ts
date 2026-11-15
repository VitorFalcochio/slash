// API exposta pelo preload do Electron (electron/preload.cjs).
interface SlashAppInfo {
  version: string;
  dataDir: string;
  /** De onde veio o local dos dados: variável SLASH_DATA_DIR, Configurações ou padrão. */
  dataDirSource: "env" | "config" | "default";
  defaultDataDir: string;
}

interface SlashDataStats {
  pages: number;
  pagesBytes: number;
  files: number;
  filesBytes: number;
  cacheBytes: number;
  dataBytes: number;
}

interface SlashBridge {
  dataDir: string;
  platform: NodeJS.Platform;
  storage: {
    get: (name: string) => Promise<string | null>;
    set: (name: string, value: string) => Promise<void>;
    remove: (name: string) => Promise<void>;
  };
  saveFile: (name: string, data: ArrayBuffer) => Promise<string>;
  setTheme: (theme: "light" | "dark") => void;
  versions: { electron: string; chrome: string; node: string };
  info: () => Promise<SlashAppInfo>;
  data: {
    stats: () => Promise<SlashDataStats>;
    openFolder: () => Promise<string>;
    chooseFolder: (title: string) => Promise<string | null>;
    inspect: (dir: string) => Promise<{ hasData: boolean; isCurrent: boolean; insideCurrent: boolean }>;
    /** "copy" copia os dados atuais para a pasta; "use" passa a usar os dados que já estão nela. Reinicia o app. */
    change: (dir: string, mode: "copy" | "use") => Promise<void>;
    /** Pede uma pasta e cria nela uma cópia dos dados. Devolve o caminho do backup (ou null se cancelado). */
    backup: () => Promise<string | null>;
    openBackup: (dir: string) => Promise<string | null>;
  };
  setSpellcheck: (enabled: boolean) => void;
}

interface Window {
  slash?: SlashBridge;
}
