// API exposta pelo preload do Electron (electron/preload.cjs).
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
}

interface Window {
  slash?: SlashBridge;
}
