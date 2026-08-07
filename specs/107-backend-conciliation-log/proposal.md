# Proposal: Backend Conciliation Math & Audit Logs (107-backend-conciliation-log)

## Problema
Atualmente, os cálculos da tela de ConciliaçÁo Diária (como "Previsto" e "Diferença") sÁo realizados "on-the-fly" no frontend. Isso causa dois problemas graves:
1. **Regras de Negócio Truncadas**: A fórmula atual para "Diferença" no frontend está sutilmente errada (`Faturam. Banco - Previsto` em vez de `Previsto - (PIX + Maquininha)`). O "Previsto" (que deveria ser a soma de faturamentos do OFX) também está confuso, gerando divergências grotescas.
2. **Falta de Rastreabilidade**: Como os cálculos sÁo 100% visuais (frontend), nÁo existe um histórico diário imutável ("snapshot auditável") de *como* o sistema chegou àquele valor. Se os saldos bancários ou faturamentos flutuam, é impossível auditar retroativamente o que aconteceu.

## SoluçÁo Proposta
1. Mover toda a inteligência do "Fechamento por Loja" e cálculo de divergências para o **Backend** usando uma funçÁo Postgres (RPC).
2. Criar uma tabela de log (`conciliation_daily_logs`) para persistir o snapshot desses cálculos diariamente por loja. O frontend fará a requisiçÁo para a RPC, que calculará os valores em tempo real, gravará o estado atual no log, e devolverá a matemática purificada. 
3. O Frontend apenas renderizará os números vindos da RPC, zerando a responsabilidade de calcular caixas, diferenças ou faturamentos previstos no React.

## Contratos de Dados
- Tabela Supabase nova: `conciliation_daily_logs`
- Campos:
  - `id` (uuid, PK)
  - `date` (date)
  - `store_id` (text, FK opcional para visualizaçÁo)
  - `faturamento_banco` (numeric) — Saldo consolidado das transações bancárias.
  - `maquininha` (numeric) — Total apurado via cartÁo/Rede.
  - `pix` (numeric) — Total apurado via PIX/OS.
  - `na_loja_os` (numeric) — Total em pátio.
  - `previsto_ofx` (numeric) — Faturamento provindo estritamente do OFX (entradas menos transferências).
  - `diferenca` (numeric) — `previsto_ofx - (pix + maquininha)`.
  - `created_at` (timestamptz)
- RLS Policies:
  - `SELECT`: `auth.role() = 'authenticated'`
  - `INSERT`: Via Service Role ou RPC com `SECURITY DEFINER`.

## API / Interface
- Nova RPC Supabase: `calculate_store_conciliation(p_date date, p_store_id text)` ou `calculate_daily_conciliation(p_date date)` que retorna os dados consolidados e já salva em `conciliation_daily_logs`.
- Frontend: Atualizar os hooks `useConciliacaoResumo` e os componentes da rota `conciliacao.index.tsx` para consumir e exibir puramente a saída desta RPC, removendo o `modulo1Calculations.ts` redundante.

## Features Existentes Impactadas
- Tela de ConciliaçÁo Index (`src/routes/conciliacao.index.tsx`)
- Detalhes de ConciliaçÁo (`src/components/conciliacao/ResumoDiaPanel.tsx`)
- Importador Central (`CentralImportWizard` acionará os recálculos)

## Risco Principal
Como o sistema financeiro inteiro foi desenhado com o Frontend somando os valores em tempo de execuçÁo, remover essa lógica abruptamente pode quebrar o layout se a RPC falhar. Além disso, garantir que a RPC some exatamente os mesmos valores do OFX (ignorando repasses internos e deduzindo taxas da forma correta) será um desafio de precisÁo SQL vs Typescript.
