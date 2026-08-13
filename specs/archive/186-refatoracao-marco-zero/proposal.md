# Proposal: Refatoração Absoluta do Marco Zero: Matemática, Logs e UI Dedicada (186)

## Problema
A importação do Marco Zero (saldo inicial legado) sofria com corrupção no banco de dados e falta de isolamento:
1. **Falta de Atomicidade e Duplicação no Banco:** O salvamento era realizado via requisições soltas do frontend em loop. Se uma falhasse ou sofresse repetição, registros duplicavam, ocorria vazamento entre lojas e o banco corrompia a matemática histórica.
2. **Ausência de Logs Transacionais e Auditoria:** O usuário não recebia um relatório detalhado nem um arquivo auditável do resultado da execução.
3. **Complexidade Indevida na Tela de Conciliação Diária:** A tela de Conciliação Diária (`/conciliacao`) tentava aplicar as mesmas regras operacionais de conciliação diária bancária (com divergências e raio-X) para a data de implantação do Marco Zero. O Marco Zero representa um **Estado Inicial da Loja (Leitura de Lastro Legado)** e não uma conciliação diária padrão.

## Solução Proposta

### 1. Backend & RPC Atômica Idempotente (`process_marco_zero_import`)
- Criar a RPC PostgreSQL `process_marco_zero_import` com transação única e isolada:
  - Limpa de forma idempotente (DELETE filtrado estritamente por `date = p_target_date` e `store_id`) apenas o estado do Marco Zero daquela data.
  - Grava atomicamente em `daily_snapshots` (com a flag `is_marco_zero: true` no metadata), `dashboard_daily_logs`, `reconciliations` e `patio_os`.
  - Isola 100% as operações por `store_id` para evitar contaminação entre filiais.
  - Retorna um payload JSON completo com a auditoria: `status`, `target_date`, `processed_stores`, `total_os_inserted`, `execution_logs`, `timestamp`.

### 2. Frontend & Logs de Execução pós-Importação (`MarcoZeroWizard.tsx`)
- Após chamar a RPC, renderizar uma **Tela/Modal de Sucesso** pós-importação.
- Exibir a síntese do que foi importado e o botão **"Baixar Logs de Execução"** (download de um `.json` formatado da resposta da RPC).

### 3. UI Dedicada na Tela de Conciliação Diária (`conciliacao.index.tsx` & `ResumoDiaPanel.tsx`)
- Na tela `/conciliacao`, ao detectar que o dia selecionado possui a flag `is_marco_zero: true`:
  - Ocultar o painel operacional de divergências diárias e botões de conciliação bancária.
  - Exibir um **Painel Dedicado de Estado Inicial da Loja (Marco Zero)** com os saldos legados do arquivo, status de integridade e indicação clara de que é a data de ancoragem patrimonial.

## Contratos de Dados
- **Flag no Metadata de Snapshot:** `metadata.is_marco_zero = true`.
- **Nova RPC SQL:** `public.process_marco_zero_import(p_target_date date, p_global jsonb, p_stores jsonb) RETURNS jsonb`.

## API / Interface
- RPC Supabase: `supabase.rpc('process_marco_zero_import', ...)`
- Componentes Frontend: `MarcoZeroWizard.tsx`, `ResumoDiaPanel.tsx`, `conciliacao.index.tsx`

## Features Existentes Impactadas
- Importador Marco Zero
- Tela de Conciliação Diária (`/conciliacao`)
- Dashboard V2

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Totalmente Reversível
- **Mitigação:** A RPC executa em um bloco de transação (`BEGIN ... EXCEPTION ... END`). Se ocorrer qualquer erro interno, o PostgreSQL faz rollback automático total.
