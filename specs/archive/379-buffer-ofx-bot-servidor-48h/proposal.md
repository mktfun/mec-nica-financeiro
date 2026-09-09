# Proposal: Hub de Arquivos OFX do Robô com Retenção de 48h (379)

## 1. Problema
Atualmente, a coleta de extratos bancários via Playwright (`itau-runner.ts`) gera arquivos locais no computador do desenvolvedor ou na pasta de downloads do servidor VPS (`https://bot.tork.services`). O operador financeiro precisa acessar manualmente o servidor ou executar o script localmente na sua máquina.
Além disso, injetar as transações bancárias baixadas diretamente nas tabelas definitivas de movimentações contábeis (`transactions` ou `ofx_transactions`) causaria graves problemas:
1. Falta de conferência e validação humana prévia.
2. Riscos de duplicações, falsas apropriações e divergências insolúveis de fechamento ("salada contábil").
3. Dependência de manter a máquina local do operador ligada para rodar automações bancárias.

## 2. Solução Proposta (Foco em Reuso e Buffer Seguro)
Implementar a arquitetura de **"Hub de Arquivos OFX Temporários do Robô"** com auto-expiração em 48h:
1. **Endpoint Headless no Servidor VPS (`bot.tork.services`)**:
   - Criar rota `POST /api/sync/itau` em [`bot/src/server.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/server.ts) que consome as credenciais já cadastradas na tabela `bank_bot_credentials` (Spec 378) e executa o Playwright em modo headless 24/7.
2. **Buffer Temporário de 48h no Supabase (`bot_downloaded_files`)**:
   - Após validar a integridade do OFX (não vazio, não HTML de erro de sessão), o robô salva o conteúdo textual do `.ofx` e seus metadados na tabela `bot_downloaded_files`.
   - **Auto-Limpeza Garantida**: A cada novo insert ou consulta, registros com mais de 2 dias (`created_at < NOW() - INTERVAL '2 days'`) são expurgados automaticamente, garantindo impacto de armazenamento próximo de zero no PostgreSQL.
3. **Painel de Extratos no Frontend (`/importacoes`)**:
   - Exibir na Central de Importações um card em Dark UI Zinc-950 com os extratos coletados nas últimas 48h.
   - Ação 1: **`[ ⬇️ Baixar OFX ]`** — Faz download imediato do arquivo `.ofx` formatado para a máquina do operador com um clique.
   - Ação 2: **`[ ⚡ Abrir na Conciliação / Enviar para o Wizard ]`** — Injeta o arquivo diretamente na esteira de conciliação do dia sem necessidade de caçar o arquivo no disco rígido.
   - Ação 3: **`[ 🤖 Disparar Coleta Agora ]`** — Botão para acionar a extração sob demanda no servidor.

---

## 3. Investigação e Análise de Reuso
- **Tabelas / RPCs Existentes:**
  - Reuso integral da tabela `bank_bot_credentials` (Spec 378) para autenticação do robô (agência, conta, CPF, senha decifrada via AES-GCM).
  - Reuso da tabela `stores` para mapeamento e vínculo das filiais (`store_id TEXT REFERENCES stores(id)`).
- **Módulos do Bot Existentes:**
  - Reuso de [`itau-runner.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/itau-runner.ts) e [`ofx-validator.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/lib/ofx-validator.ts) com `persistAndValidateOfx`.
  - Reuso do cliente Supabase e da função `getBankBotCredentials` em [`supabaseUploader.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/sync/supabaseUploader.ts).
- **Componentes do Frontend Existentes:**
  - Reuso da identidade visual Dark UI Zinc-950, botões com variantes do sistema e toasts via `sonner`.
  - Integração limpa no seletor de modo [`FechamentoModeSelector.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/importacoes/bifurcacao/FechamentoModeSelector.tsx) e na esteira de importação [`CentralImportWizard.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/importacoes/CentralImportWizard.tsx).

---

## 4. Classificação dos Arquivos

### [NEW] Novos Arquivos
- `supabase/migrations/20260908000039_bot_downloaded_files.sql`: Tabela `bot_downloaded_files`, índices, RLS e trigger/função de expurgo de 48h.
- `src/hooks/useBotDownloadedFiles.ts`: Hook React Query com listagem, disparo de download de blob no browser e acionamento de coleta no servidor.
- `src/components/importacoes/BotDownloadedFilesCard.tsx`: Card Dark UI com contagem de arquivos, filtros por data e botões de ação rápida (`[Baixar OFX]` e `[Abrir na Conciliação]`).
- `src/components/importacoes/TriggerBotModal.tsx`: Modal para disparo manual de extração no servidor VPS.

### [MODIFY] Arquivos Modificados
- `bot/src/sync/supabaseUploader.ts`: Adição de `uploadOfxBufferToSupabase(...)` e rotina de auto-limpeza de registros com mais de 2 dias.
- `bot/src/itau-runner.ts`: Adição de opção de execução parametrizada para upload automático do OFX após persistência.
- `bot/src/server.ts`: Criação da rota `POST /api/sync/itau` protegida por API Key.
- `src/components/importacoes/bifurcacao/FechamentoModeSelector.tsx`: Exibição do card de extratos do robô no fechamento diário.

---

## 5. Contratos de Dados & SQL (Supabase)

```sql
CREATE TABLE IF NOT EXISTS public.bot_downloaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  bank_code TEXT NOT NULL DEFAULT 'itau',
  bank_name TEXT NOT NULL DEFAULT 'Itaú Empresas',
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  content TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'processed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 days')
);

CREATE INDEX IF NOT EXISTS idx_bot_downloaded_files_store ON public.bot_downloaded_files(store_id);
CREATE INDEX IF NOT EXISTS idx_bot_downloaded_files_dates ON public.bot_downloaded_files(from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_bot_downloaded_files_created ON public.bot_downloaded_files(created_at);

ALTER TABLE public.bot_downloaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read bot_downloaded_files" ON public.bot_downloaded_files;
CREATE POLICY "Authenticated users can read bot_downloaded_files"
  ON public.bot_downloaded_files
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage bot_downloaded_files" ON public.bot_downloaded_files;
CREATE POLICY "Admins can manage bot_downloaded_files"
  ON public.bot_downloaded_files
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Função para expurgo de arquivos com mais de 2 dias
CREATE OR REPLACE FUNCTION public.purge_expired_bot_files()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.bot_downloaded_files
  WHERE created_at < (now() - interval '2 days');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
```

---

## 6. Risco Principal e Mitigação
* **Risco:** Um arquivo corrompido ou resposta HTML de erro do banco de dados ser salvo no buffer e quebrar o wizard do usuário.
* **Mitigação:** Validação rígida em duas camadas:
  1. No bot ([`ofx-validator.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/bot/src/lib/ofx-validator.ts)): Bloqueia arquivos vazios e respostas HTML de timeout do banco antes de enviar ao Supabase.
  2. No frontend: Verifica a integridade dos cabeçalhos OFX (`OFXHEADER:` / `<OFX>`) antes de disparar o download ou injetar no wizard.
