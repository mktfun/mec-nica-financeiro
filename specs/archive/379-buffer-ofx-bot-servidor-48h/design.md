# Design: Hub de Arquivos OFX do Robô com Retenção de 48h (379)

## 1. Arquitetura e Fluxo de Dados Ponta a Ponta

```
[ Operador / Web UI ]
         │
         │ 1. [Disparar Coleta] ou Agendamento Diário (Cron)
         ▼
[ Servidor VPS: bot.tork.services ] (Docker / Express)
         │
         │ 2. POST /api/sync/itau { store, from, to }
         ▼
[ itau-runner.ts (Playwright Headless) ]
         │
         │ 3. Consulta credencial (bank_bot_credentials)
         │ 4. Executa Login, Navegação e Download OFX
         │ 5. Validação via persistAndValidateOfx()
         ▼
[ Supabase: public.bot_downloaded_files ]
         │ (Armazena conteúdo bruto do OFX com expiração de 48h)
         │ 6. Executa purge_expired_bot_files() (limpa arquivos > 48h)
         ▼
[ Frontend: /importacoes (BotDownloadedFilesCard.tsx) ]
         │
         ├───> [ ⬇️ Baixar OFX ] ───> Cria Blob local e inicia download no browser
         │
         └───> [ ⚡ Abrir na Conciliação ] ───> Cria File('extrato.ofx') e injeta no wizard
```

---

## 2. Interfaces TypeScript

```typescript
// Registro retornado do Supabase (tabela bot_downloaded_files)
export interface BotDownloadedFile {
  id: string;
  store_id: string;
  bank_code: string;
  bank_name: string;
  file_name: string;
  file_size_bytes: number;
  content: string;
  sha256: string;
  from_date: string; // YYYY-MM-DD
  to_date: string;   // YYYY-MM-DD
  status: 'available' | 'processed' | 'expired';
  created_at: string;
  expires_at: string;
  // Join com stores
  stores?: {
    id: string;
    name: string;
    code?: string;
  } | null;
}

// Payload para disparo de extração no servidor VPS
export interface TriggerItauExtractionPayload {
  store: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  account?: string;
  agency?: string;
  headless?: boolean;
}

// Resposta do endpoint /api/sync/itau
export interface TriggerItauExtractionResponse {
  success: boolean;
  message?: string;
  error?: string;
  file?: {
    id: string;
    fileName: string;
    fileSizeBytes: number;
    sha256: string;
    expiresAt: string;
  };
}
```

---

## 3. Mutações em Arquivos Existentes [MODIFY]

### `bot/src/sync/supabaseUploader.ts`
- Implementar função `uploadOfxBufferToSupabase`:
  - Recebe metadados do arquivo e buffer/string do OFX.
  - Executa insert em `bot_downloaded_files`.
  - Dispara `DELETE FROM bot_downloaded_files WHERE created_at < NOW() - INTERVAL '2 days'`.
  - Retorna o ID gerado e metadados de confirmação.

### `bot/src/itau-runner.ts`
- Exportar função programática `runItauScraperTask(options)`:
  - Permite invocar a automação via chamada TypeScript/Express (não apenas via CLI `process.argv`).
  - Executa o ciclo e faz o upload automático para o Supabase se a flag `uploadToBuffer: true` estiver ativa.

### `bot/src/server.ts`
- Adicionar rota `POST /api/sync/itau`:
  - Valida `requireApiKey`.
  - Lê parâmetros `{ store, from, to, account, agency }`.
  - Invoca `runItauScraperTask`.
  - Retorna 200 com os dados do arquivo gerado no buffer do Supabase.

### `src/components/importacoes/bifurcacao/FechamentoModeSelector.tsx`
- Adicionar componente `<BotDownloadedFilesCard />` logo abaixo da barra superior de data:
  - Seletor de data reativo sincronizado com `selectedDate`.
  - Lista clara de extratos coletados pelo robô.
  - Botões para baixar o arquivo no computador ou abrir na conciliação.

---

## 4. Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Disparo e Coleta de Extrato com Download no Browser
- **SCAN:** Usuário acessa `/importacoes` com a data `2026-09-08`.
- **INFER:** O robô no servidor VPS executou a coleta da loja Matriz para o período `2026-09-05` a `2026-09-08`. A tabela `bot_downloaded_files` possui 1 registro disponível.
- **VERIFY:** O card exibe "Itaú Empresas — Matriz (05/09/2026 a 08/09/2026)", tamanho 38.4 KB e tempo para expiração. Ao clicar em `[ ⬇️ Baixar OFX ]`, o navegador realiza o download de `Extrato_0263_811531_matriz_2026-09-05_2026-09-08.ofx` intacto.
- **FIX:** Se o arquivo não contiver cabeçalho OFX válido, o botão acusa aviso amigável e impede o download de payload corrompido.

### Cenário 2: Auto-limpeza de 48h (Garantia de Espaço Zero)
- **SCAN:** Arquivos com `created_at` anterior a 48 horas atrás residem na tabela.
- **INFER:** A política de retenção determinística deve expurgar qualquer registro com mais de 2 dias de vida.
- **VERIFY:** A função `purge_expired_bot_files()` é acionada e os registros obsoletos são deletados da tabela, mantendo o banco livre de acúmulo.
- **FIX:** Caso a exclusão em lote falhe por restrição de foreign key ou concorrência, o hook frontend ignora registros expirados com base em `expires_at < now()`.
