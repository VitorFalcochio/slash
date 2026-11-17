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
  updates: {
    getStatus: () => Promise<SlashUpdateStatus>;
    /** Procura agora (botão em Configurações → Sobre). */
    check: () => Promise<SlashUpdateStatus>;
    /** Fecha o app, instala a versão baixada e abre de novo. */
    install: () => Promise<boolean>;
    /** Avisa a cada mudança; devolve a função que para de ouvir. */
    onStatus: (callback: (status: SlashUpdateStatus) => void) => () => void;
  };
  setSpellcheck: (enabled: boolean) => void;
}

/** Estado da atualização automática (electron/updater.cjs). */
interface SlashUpdateStatus {
  state: "idle" | "checking" | "available" | "downloading" | "downloaded" | "not-available" | "error" | "disabled";
  version?: string;
  percent?: number;
  message?: string;
}

/** Assistente de IA (electron/ai.cjs, exposto como window.slashAI). */
interface SlashAIMessage {
  role: "user" | "assistant";
  text: string;
}

interface SlashAIRequest {
  model: string;
  system: string;
  messages: SlashAIMessage[];
  /** JSON Schema: a resposta vem como JSON que segue este formato. */
  schema?: object;
}

interface SlashAIBridge {
  status: () => Promise<{ hasKey: boolean; encryptionAvailable: boolean }>;
  /** Testa a chave e guarda criptografada. Lança erro com mensagem em português se não funcionar. */
  setKey: (key: string, model: string) => Promise<boolean>;
  clearKey: () => Promise<boolean>;
  generate: (request: SlashAIRequest) => Promise<string>;
  stream: (
    id: string,
    request: Omit<SlashAIRequest, "schema">,
    handlers: { onChunk: (text: string) => void; onDone: () => void; onError: (message: string) => void },
  ) => Promise<boolean>;
  cancel: (id: string) => Promise<boolean>;
}

interface Window {
  slash?: SlashBridge;
  slashAI?: SlashAIBridge;
}
