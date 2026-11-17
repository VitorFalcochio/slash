// Assistente de IA (Google Gemini). Roda no processo principal: a chave de API nunca chega à página.
// A chave fica em DATA_DIR/ai-key.bin, criptografada pelo sistema (safeStorage → DPAPI no Windows).
const { ipcMain, safeStorage } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const KEY_FILE = "ai-key.bin";

/** Erro do Gemini em uma frase que dá para mostrar ao usuário. */
function friendlyError(error) {
  const status = error?.status;
  const raw = String(error?.message || error);
  if (error?.name === "AbortError" || /aborted/i.test(raw)) return "Cancelado.";
  if (status === 400 && /api key/i.test(raw)) return "Chave de API inválida. Confira em Configurações → Assistente IA.";
  if (status === 401 || status === 403) return "A chave de API não tem permissão para usar o Gemini.";
  if (status === 404) return "Modelo não encontrado. Escolha outro em Configurações → Assistente IA.";
  if (status === 429) return "Limite de uso do Gemini atingido. Espere um pouco ou confira sua cota no Google AI Studio.";
  if (status >= 500) return "O Gemini está instável agora. Tente de novo em instantes.";
  if (/fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|network/i.test(raw)) return "Sem conexão com a internet.";
  return raw.length > 300 ? `${raw.slice(0, 300)}...` : raw;
}

/** Conversa no formato do Gemini: { role: "user" | "model", parts: [{ text }] }. */
function toContents(messages) {
  return messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.text) }] }));
}

/** @param {{ dataDir: string }} options */
function setupAI({ dataDir }) {
  const keyPath = path.join(dataDir, KEY_FILE);
  const running = new Map(); // id do pedido → AbortController
  let client = null; // GoogleGenAI, criado só quando há chave

  const sdk = () => require("@google/genai");

  function readKey() {
    try {
      if (!fs.existsSync(keyPath) || !safeStorage.isEncryptionAvailable()) return null;
      return safeStorage.decryptString(fs.readFileSync(keyPath));
    } catch (error) {
      console.error("[ia] não foi possível ler a chave", error);
      return null;
    }
  }

  function getClient() {
    if (client) return client;
    const apiKey = readKey();
    if (!apiKey) throw Object.assign(new Error("Configure sua chave do Gemini em Configurações → Assistente IA."), { code: "NO_KEY" });
    client = new (sdk().GoogleGenAI)({ apiKey });
    return client;
  }

  ipcMain.handle("ai:status", () => ({
    hasKey: fs.existsSync(keyPath),
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
  }));

  // Testa a chave com uma chamada mínima antes de guardar.
  ipcMain.handle("ai:set-key", async (_e, apiKey, model) => {
    const key = String(apiKey || "").trim();
    if (!key) throw new Error("Cole a chave de API.");
    if (!safeStorage.isEncryptionAvailable()) throw new Error("Este computador não permite guardar a chave com segurança.");
    const test = new (sdk().GoogleGenAI)({ apiKey: key });
    try {
      await test.models.generateContent({ model, contents: "Responda apenas: ok", config: { maxOutputTokens: 16 } });
    } catch (error) {
      throw new Error(friendlyError(error));
    }
    await fsp.writeFile(keyPath, safeStorage.encryptString(key));
    client = test;
    return true;
  });

  ipcMain.handle("ai:clear-key", async () => {
    client = null;
    await fsp.rm(keyPath, { force: true });
    return true;
  });

  // Resposta inteira de uma vez; com `schema`, devolve JSON validado pelo Gemini.
  ipcMain.handle("ai:generate", async (_e, request) => {
    const { model, system, messages, schema } = request;
    try {
      const response = await getClient().models.generateContent({
        model,
        contents: toContents(messages),
        config: {
          systemInstruction: system,
          ...(schema ? { responseMimeType: "application/json", responseJsonSchema: schema } : {}),
        },
      });
      return response.text ?? "";
    } catch (error) {
      throw new Error(error?.code === "NO_KEY" ? error.message : friendlyError(error));
    }
  });

  // Resposta em pedaços: devolve na hora e envia "ai:chunk" / "ai:done" / "ai:error" para a janela.
  ipcMain.handle("ai:stream", (e, id, request) => {
    const { model, system, messages } = request;
    const sender = e.sender;
    const send = (channel, ...args) => !sender.isDestroyed() && sender.send(channel, id, ...args);
    const controller = new AbortController();
    running.set(id, controller);

    (async () => {
      try {
        const stream = await getClient().models.generateContentStream({
          model,
          contents: toContents(messages),
          config: { systemInstruction: system, abortSignal: controller.signal },
        });
        for await (const chunk of stream) {
          if (controller.signal.aborted) break;
          if (chunk.text) send("ai:chunk", chunk.text);
        }
        send("ai:done");
      } catch (error) {
        if (controller.signal.aborted) send("ai:done");
        else send("ai:error", error?.code === "NO_KEY" ? error.message : friendlyError(error));
      } finally {
        running.delete(id);
      }
    })();
    return true;
  });

  ipcMain.handle("ai:cancel", (_e, id) => {
    running.get(id)?.abort();
    running.delete(id);
    return true;
  });
}

module.exports = { setupAI };
