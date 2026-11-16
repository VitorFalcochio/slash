# Slash

App desktop no estilo Notion: páginas aninhadas, editor de blocos com menu de comandos (Ctrl+Espaço), emojis da Apple, ícones, capas, favoritos, lixeira e busca (Ctrl+K).

## Comandos

```bash
npm install
npm run dev      # Next + Electron com recarregamento automático
npm run build    # gera a interface estática em out/
npm start        # abre o Electron usando out/
npm run dist     # build + instalador Windows em release/ (sem publicar)
npm run release  # build + instalador + publica no GitHub Releases (atualização automática)
npm run icon     # regera os ícones a partir de electron/icon.svg
```

> No PowerShell, se aparecer "a execução de scripts foi desabilitada", use `npm.cmd` no lugar de `npm`
> ou rode uma vez `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

## Atualização automática

O app instalado procura versão nova no [GitHub Releases](https://github.com/VitorFalcochio/slash/releases)
10 segundos depois de abrir e a cada 4 horas. Quando acha, baixa em segundo plano e mostra um aviso
com "Reiniciar agora". Se ignorar, instala quando o app for fechado. Também dá para verificar em
**Configurações → Sobre → Atualizações**. Em `npm run dev` isso fica desligado.

### Publicar uma versão nova

1. Aumente a `version` no `package.json` (ex.: `0.1.0` → `0.2.0`). **Sem isso o app não vê a atualização.**
2. Crie um token no GitHub (Settings → Developer settings → Personal access tokens → *Fine-grained*,
   só o repositório `slash`, permissão **Contents: Read and write**).
3. No PowerShell:

   ```powershell
   $env:GH_TOKEN = "seu_token"
   npm.cmd run release
   ```

Isso envia para o GitHub o `Slash-Setup-<versão>.exe`, o `.blockmap` e o `latest.yml` (é esse arquivo
que o app lê para saber se existe versão nova). O repositório precisa continuar **público** para o
app conseguir baixar sem senha.

O instalador não é assinado digitalmente, então na primeira instalação o Windows SmartScreen pode
avisar "editor desconhecido" (clique em *Mais informações → Executar assim mesmo*). As atualizações
seguintes funcionam normalmente.

## Onde ficam os dados

Tudo fica em `E:\SlashData` (configurável pela variável `SLASH_DATA_DIR`):

- `slash-documents.json`: páginas (com `.bak` da versão anterior a cada gravação)
- `files/`: imagens e anexos enviados
- `electron/`: dados internos do Electron/Chromium (cache etc.)

## Stack

- **Electron**: janela nativa com barra de título integrada; serve `out/` pelo protocolo `app://` e os anexos por `slash-file://`
- **Next.js 16** (export estático) + **Tailwind CSS 4**
- **BlockNote** como editor (em português)
- **Zustand** para estado, persistido no disco via IPC (`electron/preload.cjs`)
- **emoji-datasource-apple**: imagens dos emojis da Apple, empacotadas offline

## Estrutura

```
electron/          processo principal, preload, atualização automática (updater.cjs) e ícone
scripts/           dev do Electron, cópia dos emojis, geração do ícone
src/
  app/             rotas (/documents?id=..., /preview?id=...)
  components/
    editor/        BlockNote + extensão que desenha emojis com imagens da Apple
    sidebar/       barra lateral, árvore de páginas, lixeira
    document/      navbar, capa, ícone, título
    views/         componentes cliente de cada rota
  lib/             armazenamento, emojis, utilitários
  store/           stores Zustand
```

## Emojis da Apple

Os emojis continuam salvos como texto Unicode. Só a exibição troca o glifo do sistema pela imagem da Apple (`.apple-emoji` em `globals.css`). Assim, copiar, colar e buscar funcionam normalmente.
As imagens são da Apple; servem para uso pessoal, mas não para distribuir o app publicamente.
