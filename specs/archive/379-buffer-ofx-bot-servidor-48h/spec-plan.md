# Spec Plan: Hub de Arquivos OFX do Robô com Retenção de 48h (379)

## Tasks Atômicas

- [x] `[DB-MIGRATION]` **Criação da Tabela `bot_downloaded_files` e Rotina de Limpeza de 48h**
  - Criar migration `supabase/migrations/20260908000039_bot_downloaded_files.sql`.
  - Definir campos `store_id TEXT REFERENCES stores(id)`, `bank_code`, `bank_name`, `file_name`, `file_size_bytes`, `content`, `sha256`, `from_date`, `to_date`, `status`, `created_at`, `expires_at`.
  - Criar RPC `purge_expired_bot_files()` para deletar registros com `created_at < NOW() - INTERVAL '2 days'`.
  - Habilitar RLS para leitura e inserção de usuários autenticados.
  - *Critério de Verificação*: Migration aplicada no Supabase remoto via script headless com exit code 0.

- [x] `[BOT-UPLOADER]` **Implementação de Upload e Auto-Limpeza no Módulo Bot**
  - Adicionar função `uploadOfxBufferToSupabase` em `bot/src/sync/supabaseUploader.ts`.
  - Inserir o arquivo `.ofx` como texto UTF-8/Latin1 preservado na tabela `bot_downloaded_files`.
  - Executar auto-purge na mesma transação/chamada para garantir que arquivos obsoletos sejam removidos.
  - *Critério de Verificação*: Script de teste valida envio de buffer simulado e retorno de ID.

- [x] `[BOT-RUNNER-TASK]` **Exportação Programática de `runItauScraperTask`**
  - Modularizar `bot/src/itau-runner.ts` para exportar `runItauScraperTask(options)` recebendo parâmetros `{ store, from, to, account, agency, headless, uploadToBuffer }`.
  - Ao concluir a validação do OFX com sucesso, chamar `uploadOfxBufferToSupabase`.
  - *Critério de Verificação*: Função pode ser invocada programaticamente sem depender de `process.argv`.

- [x] `[BOT-SERVER-ENDPOINT]` **Criação do Endpoint `POST /api/sync/itau` em `server.ts`**
  - Adicionar rota no Express `bot/src/server.ts` protegida por `requireApiKey`.
  - Ler payload `{ store, from, to, account, agency }` e despachar `runItauScraperTask`.
  - Retornar resposta JSON padronizada `{ success: true, file: { id, fileName, fileSizeBytes, expiresAt } }`.
  - *Critério de Verificação*: Chamada curl/node local em `http://localhost:3001/api/sync/itau` ou validação com mock retorna status 200.

- [x] `[FRONTEND-HOOK]` **Hook React Query `useBotDownloadedFiles.ts`**
  - Criar queries para listar arquivos recentes com ordenação por `created_at desc` e join com `stores(name, code)`.
  - Implementar função utilitária `downloadOfxFile(content: string, fileName: string)` que dispara download de arquivo `.ofx` no browser via `Blob` e link invisível.
  - Implementar mutation `useTriggerBotExtraction()` para acionar a rota do bot no servidor.
  - *Critério de Verificação*: Hook permite listar e disparar download direto sem erros de renderização.

- [x] `[FRONTEND-CARD]` **Componente `BotDownloadedFilesCard.tsx` e Modal de Disparo**
  - Construir card Dark UI Zinc-950 com cabeçalho informativo: "Extratos Coletados pelo Robô (Últimas 48h)".
  - Exibir badge com contagem de arquivos e pílula indicando tempo de retenção (48h).
  - Listar arquivos com: ícone/logo do banco, filial, período, data/hora da coleta, tamanho em KB e tempo para expiração.
  - Botão de ação primária: `[ ⬇️ Baixar OFX ]` (download imediato no computador).
  - Botão de ação secundária: `[ ⚡ Abrir na Conciliação ]` (cria objeto `File` e avança para o wizard).
  - Botão no cabeçalho: `[ 🤖 Disparar Coleta Agora ]` (abre modal de confirmação de loja e datas).
  - *Critério de Verificação*: Card renderiza com estados de loading, empty e lista interativa.

- [x] `[INTEGRATION-UI]` **Integração na Tela `/importacoes`**
  - Integrar `<BotDownloadedFilesCard />` em `FechamentoModeSelector.tsx` (exibido na visão inicial da aba "Fechamento Diário").
  - Conectar ação de "Abrir na Conciliação" para chavear diretamente para o modo manual com o arquivo pré-carregado.
  - *Critério de Verificação*: Acessar `http://localhost:8080/importacoes` e visualizar o card interativo e funcional.

- [x] `[BUILD-GATE]` **Auditoria de Build e Integridade TypeScript**
  - Executar `npx tsc --noEmit` no módulo `bot/`.
  - Executar `npm run build` na raiz do projeto e garantir 0 erros de compilação.
  - *Critério de Verificação*: Build executado com sucesso e tela acessível sem erros em `http://localhost:8080/importacoes`.
