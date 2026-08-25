# Proposal: 282 — Blindagem Definitiva de Idempotência, Consistência Temporal do Cofre e Conciliação Canônica Multi-Loja

## Problema
Durante a operação diária do sistema de conciliação financeira das 10 filiais, a auditoria forense sênior diagnosticou 3 anomalias críticas no motor de cálculo e persistência:

1. **Dinheiro em Espécie (Cofre & Pátio):**
   - **Idempotência Frágil:** A verificação de duplicatas no cofre (`store_cash_vault`) usava `.ilike('description', '%OS #<numero>%')` em texto livre não indexado, gerando duplicações em cenários concorrentes ou nomes com variações.
   - **Destruição Histórica na Baixa:** Ao marcar `status = 'depositado'`, a RPC `get_daily_reconciliation_summary` usava `WHERE status IN ('em_transito', 'pending')`, excluindo o valor retroativamente de datas anteriores ($D$) onde o dinheiro ainda estava fisicamente no cofre antes de ser creditado no extrato OFX em $D+1$. Isso causava falsas divergências contábeis de até R$ 2.500 por ocorrência em dias históricos já fechados.

2. **Maquininhas & Rede (POS, Match e Juros):**
   - **Colisão de Hash de Deduplicação:** `CentralImportWizard.tsx` usava fallback fixo `'Importação Rede'` para o título do item, fazendo com que vendas legítimas de mesmo valor na mesma filial e data gerassem o mesmo `dedup_hash` e fossem descartadas no `upsert` com `ignoreDuplicates: true`.
   - **Duplicação de Juros e Falso "Não Entrou":** Reimportações sem constraint física no banco acumulavam linhas em `pos_transactions`, duplicando `rede_liquido` e `fee_amount` na agregação da RPC, gerando falsos cartões a compensar e juros inflados no subtotal de contas.

3. **Reimportação Geral & Pátio de OSs:**
   - **Race Conditions e Falta de Constraint:** `patio_os` não possuía constraint única `UNIQUE (store_id, os_number)`, permitindo que importações simultâneas ou reprocessamento criassem duplicatas.
   - **Sobrescrita Destrutiva:** Reimportações de planilhas antigas podiam sobrescrever o `paid_value` de OSs já quitadas, corrompendo o saldo em estoque ($P_4$).

## Solução Proposta
Implementar uma blindagem arquitetural de ponta a ponta sem quebrar a retrocompatibilidade ou funcionalidades existentes:

1. **Banco de Dados (PostgreSQL Migration):**
   - Limpeza preventiva e determinística de duplicatas históricas em `store_cash_vault`, `pos_transactions` e `patio_os`.
   - Adição da coluna dedicada `os_number_ref TEXT` em `store_cash_vault` com retroalimentação via regex e criação de índice único `uq_store_cash_vault_store_os UNIQUE (store_id, os_number_ref) WHERE os_number_ref IS NOT NULL`.
   - Criação de índice único `uq_patio_os_store_os_number UNIQUE (store_id, os_number)` em `patio_os`.
   - Adição da coluna `dedup_hash TEXT` em `pos_transactions` (se não existir) com índice único `uq_pos_transactions_store_hash UNIQUE (store_id, dedup_hash)`.

2. **RPC Canônica (`get_daily_reconciliation_summary`):**
   - Ajuste da cláusula temporal do cofre para preservar a integridade histórica:
     ```sql
     WHERE entry_date <= v_target_date 
       AND (
         status IN ('em_transito', 'pending') 
         OR (status = 'depositado' AND (deposited_at IS NULL OR deposited_at::date > v_target_date))
       )
     ```
   - Exposição da propriedade `deposited_at` no JSON `vault_entries` retornado por filial.

3. **Camada de Ingestão Frontend (TypeScript Hooks & Wizards):**
   - **`useImportProcessor.ts`:** Lookup atômico em `store_cash_vault` usando `os_number_ref`, com atualização idempotente de valor caso esteja `em_transito`.
   - **`CentralImportWizard.tsx`:** Inclusão de entropia única por linha (`idx`, bandeira/método, valor bruto e líquido) na geração de `dedup_hash` para evitar descarte de vendas homólogas.
   - **`SaldoBancosDetailModal.tsx`:** Garantir que o timestamp de baixa (`deposited_at`) seja gravado com precisão e que a invalidação do cache React Query atualize imediatamente os saldos.

## Contratos de Dados

### Tabela `store_cash_vault`
- `os_number_ref`: `TEXT NULL` (referência canônica à OS que gerou a entrada em dinheiro).
- Índice: `CREATE UNIQUE INDEX uq_store_cash_vault_store_os ON public.store_cash_vault(store_id, os_number_ref) WHERE os_number_ref IS NOT NULL;`
- Restrição de Mutações: INSERT com `os_number_ref` único por `store_id`. UPDATE de status apenas com registro de `deposited_at`.

### Tabela `patio_os`
- Constraint: `CREATE UNIQUE INDEX uq_patio_os_store_os_number ON public.patio_os(store_id, os_number);`
- Mutações: Upsert idempotente preservando `paid_value` existente via `GREATEST`.

### Tabela `pos_transactions`
- `dedup_hash`: `TEXT NOT NULL`
- Constraint: `CREATE UNIQUE INDEX uq_pos_transactions_store_hash ON public.pos_transactions(store_id, dedup_hash);`

## API / Interface

### RPC `get_daily_reconciliation_summary(p_date text)`
- **Assinatura:** Inalterada (retrocompatível).
- **Comportamento Interno:** Agrega dinheiro em cofre considerando a data de depósito (`deposited_at::date > v_target_date`), garantindo fechamentos passados imutáveis.
- **Payload `stores[].vault_entries`:** Adiciona campo `deposited_at` em cada objeto do array.

### Hook `useImportProcessor`
- Função `processOsAndReceivables`: Atualizada para buscar e inserir `os_number_ref` diretamente.

## Features Existentes Impactadas
- **Spec 272 / Spec 273 (Apuração Dinheiro Cofre & Pilares):** O cálculo dos 5 Pilares passa a respeitar a linha do tempo estrita sem volatilidade pós-baixa.
- **Spec 274 / Spec 277 (Pátio de OSs & Carryover):** Pátio protegido contra colisões de concorrência e sobrescrita de quitações.
- **Spec 280 / Spec 281 (Deduplicação de POS e Conciliação de Cartão):** Eliminação de descartes indevidos de vendas reais e de juros inflados.

## Risco Principal
- **Risco:** Existência de dados duplicados legados no banco antes da criação dos índices únicos (`UNIQUE INDEX`), o que causaria falha na execução da migração (`duplicate key value violates unique constraint`).
- **Mitigação:** A migração incluirá scripts de deduplicação prévia (`DELETE USING a.id > b.id`) antes de aplicar qualquer índice único.
