# Slash

App desktop no estilo Notion: páginas aninhadas, editor de blocos com menu de comandos (Ctrl+Espaço), emojis da Apple, ícones, capas, favoritos, lixeira e busca (Ctrl+K).

## Comandos

```bash
npm install
npm run dev      # Next + Electron com recarregamento automático
npm run build    # gera a interface estática em out/
npm start        # abre o Electron usando out/
npm run dist     # build + instalador Windows em release/
```

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
electron/          processo principal, preload e ícone
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
