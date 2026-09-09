# Proposal: Cockpit de Diagnóstico 360° Pós-Motor — Batimento Loja x Valor Líquido x Bandeira (Entrou / Não Entrou) (384)

## Problema
Após a execução do motor de conciliação e salvamento no `CentralImportWizard.tsx` (Step 8), o operador é recepcionado por métricas macro genéricas (quantidade de OSs, extratos, delta geral) e logs brutos de terminal.
Esse modelo apresenta falhas críticas de transparência e controle operacional:
1. **Ausência de Comparação Discriminada Loja × Valor Líquido × Bandeira:** O operador não consegue enxergar de imediato quanto vendeu na Rede por bandeira (Visa, Master, Elo), quanto efetivamente caiu na conta do Itaú (`Entrou`), quanto está em trânsito legal para $D+1$ ou $D+30$ (`A Compensar`), e quanto a adquirente atrasou ou reteve indevidamente (`Não Entrou`).
2. **Descasamento Temporal e Risco de Dupla Contagem (Ativo Fantasma):** Vendas em débito de $D$ só caem em $D+1$ útil no banco. Se o sistema não amarrar a liquidação por lote com `expected_credit_date`, as vendas continuam como pendentes enquanto o extrato bancário de amanhã já inflou o saldo, duplicando o caixa aparente do Pilar 1.
3. **Rejeição Cega de Lotes por Aluguel de POS:** No início do mês, a Rede retém R$ 119,00 a R$ 238,00 do crédito bancário referente ao aluguel de maquininhas. O sistema trata isso como erro de centavos em vez de diagnosticar a despesa e oferecer baixa imediata.
4. **Vulnerabilidade de Update Cego no Wizard ([CentralImportWizard.tsx:1870](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/importacoes/CentralImportWizard.tsx#L1870)):** O código atual executa `update({ settlement_status: 'entrou' }).eq('store_id', sId).eq('target_date', targetDate)`, marcando indiscriminadamente todas as vendas da filial como liquidadas se houver qualquer item, zerando artificialmente as pendências reais.

---

## Solução Proposta (Foco em Reuso e Correção)

Implementar o **Cockpit de Diagnóstico 360° Pós-Motor** diretamente no Step 8 do `CentralImportWizard.tsx`, aproveitando 80% do ferramental já existente no ecossistema:

1. **Backend / Banco de Dados (`[MODIFY]`):**
   - Enriquecer a tabela existente `public.pos_transactions` com 4 colunas essenciais: `brand`, `expected_credit_date`, `nsu`, `authorization_code`.
   - Atualizar a RPC existente `public.get_store_pos_triple_reconciliation(p_target_date)` para entregar o payload consolidado e estruturado dos 4 status canônicos (`entrou`, `nao_entrou`, `a_compensar`, `divergente`), segregados por **Loja (10 filiais)** e por **Bandeira da Rede**, mantendo 100% de compatibilidade retroativa.
2. **Motor de Lotes e Correção de Bugs (`[MODIFY]`):**
   - Corrigir o update cego de `CentralImportWizard.tsx:1870` para filtrar estritamente pelos IDs das transações baixadas (`.in('id', matchedIds)`).
   - Integrar os buckets determinísticos de `KNOWN_POS_RENTAL_FEES` (R$ 119, R$ 238) para sugerir a classificação automática da despesa de aluguel de maquininha em 1 clique.
3. **Frontend & Cockpit Visual (`[NEW]` / `[MODIFY]`):**
   - Criar `PostMotorDiagnosticCockpit.tsx` no Step 8 com padrão Dark UI Zinc-950:
     - **4 Action Cards no Topo:** Lojas 100% Batidas, Cartões a Compensar (Não Entrou), Transações Órfãs, e Selagem Rápida em 1-Clique.
     - **Tabela Canônica de Alta Densidade:** Loja, Venda Rede Líquida, Creditado OFX, Não Entrou/A Compensar, PIX x OS, Pátio WIP, Status e Ações.
     - **Accordion Inline por Linha:** Expansão direta na tabela exibindo a quebra por bandeira (Visa, Master, Elo, Hiper, PIX) e as transações do OFX vinculadas com FITID.
     - **Propriedade `initialStoreId` em `MaquininhasDetailModal.tsx` (`[MODIFY]`):** Para permitir abertura com foco direto na filial selecionada.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Encontradas (`Database Specialist`):**
  - Tabela `public.pos_transactions`: Já possui `gross_amount`, `net_amount`, `fee_amount`, `settlement_status`, `matched_os_number`. Será estendida via `ALTER TABLE ADD COLUMN IF NOT EXISTS brand, expected_credit_date, nsu, authorization_code`.
  - RPC `public.get_store_pos_triple_reconciliation`: Já é a função designada para o batimento triplo de cartões. Será atualizada via `CREATE OR REPLACE FUNCTION` para calcular os agregados por Loja e por Bandeira sem criar nenhuma RPC paralela.
  - Tabela `public.ofx_transactions`: Reutilizada para extração dos depósitos de adquirente (`counterpart_name ILIKE '%REDE%'`).
  - Tabela `public.reconciliations`: Mantida intacta como SSOT dos fechamentos por loja.
- **Componentes / Hooks Existentes Encontrados (`Frontend Specialist`):**
  - `src/components/conciliacao/MaquininhasDetailModal.tsx`: Contém 90% da lógica de batimento de maquininhas por loja e visualização de chips OFX. Será reaproveitado e estendido com `initialStoreId`.
  - `src/components/conciliacao/StoreCartaoMaquininhaView.tsx`: Fornece a paleta canônica de cores e badges por bandeira (`getBrandBadgeColor`).
  - `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`: Fornece o padrão de design de tabela com accordion inline (`<tr><td colSpan={8}>`).
  - `src/hooks/useConciliacao.ts`: Fornece o consumo reativo do resumo e constantes de aluguel POS (`KNOWN_POS_RENTAL_FEES`).
- **Análise de Grafo e Riscos (`Graphify & Risk Auditor`):**
  - Mapeou todos os consumidores de `pos_transactions` e `reconciliations`.
  - Identificou e priorizou a correção do bug de update cego em `CentralImportWizard.tsx:1870`.
  - Blindou a fórmula do Pilar 1 (`v_cartoes_a_compensar`) contra dupla contagem de vendas já creditadas no banco.

---

## Contratos de Dados & SQL (Supabase)

### 1. Migração DDL (`supabase/migrations/20260909000041_cockpit_pos_triple_reconciliation_brand.sql`)
```sql
-- 1. Adicionar colunas na tabela pos_transactions
ALTER TABLE public.pos_transactions 
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS expected_credit_date DATE,
  ADD COLUMN IF NOT EXISTS nsu TEXT,
  ADD COLUMN IF NOT EXISTS authorization_code TEXT;

-- 2. Backfill inicial para transações existentes
UPDATE public.pos_transactions
SET brand = CASE 
    WHEN LOWER(COALESCE(machine_name, '') || ' ' || COALESCE(payment_method, '')) LIKE '%visa%' THEN 'Visa'
    WHEN LOWER(COALESCE(machine_name, '') || ' ' || COALESCE(payment_method, '')) LIKE '%mast%' THEN 'Mastercard'
    WHEN LOWER(COALESCE(machine_name, '') || ' ' || COALESCE(payment_method, '')) LIKE '%elo%' THEN 'Elo'
    WHEN LOWER(COALESCE(machine_name, '') || ' ' || COALESCE(payment_method, '')) LIKE '%hiper%' THEN 'Hipercard'
    WHEN LOWER(COALESCE(machine_name, '') || ' ' || COALESCE(payment_method, '')) LIKE '%pix%' THEN 'PIX'
    ELSE 'Outras'
END
WHERE brand IS NULL;

-- 3. Substituir RPC public.get_store_pos_triple_reconciliation(p_target_date text)
-- Retornando KPIs globais, quebra por Loja, quebra por Bandeira, e transações sinalizadas.
```

---

## API & Componentes (Frontend)

### Arquivos Afetados:
- `[MODIFY]` `src/components/importacoes/CentralImportWizard.tsx`: Integrar o cockpit no Step 8 quando `saveFinished === true` e corrigir a linha 1870 (update por ID).
- `[MODIFY]` `src/components/conciliacao/MaquininhasDetailModal.tsx`: Adicionar prop `initialStoreId?: string | null`.
- `[NEW]` `src/components/importacoes/wizard/PostMotorDiagnosticCockpit.tsx`: Componente mestre do Cockpit 360° pós-motor.
- `[NEW]` `src/components/importacoes/wizard/DiagnosticActionCards.tsx`: 4 Cards de ação rápida e métricas agregadas.
- `[NEW]` `src/components/importacoes/wizard/StoreDiagnosticRow.tsx`: Linha da tabela com accordion inline de detalhamento por bandeiras e depósitos OFX.
- `[NEW]` `src/types/cockpit360.ts`: Contratos TypeScript com validação tipada.

---

## Risco Principal e Mitigação
- **Risco Principal:** Inconsistência entre o total exibido no Cockpit 360° e a apuração oficial dos 5 Pilares na RPC `get_daily_reconciliation_summary` (gerando desconfiança do operador).
- **Mitigação:** O Cockpit 360° consome a mesma fonte física (`pos_transactions` e `ofx_transactions`) e alinha sua taxonomia com as CTEs canônicas da RPC mestra, garantindo que $\text{Rede Líquido} = \text{Entrou} + \text{Não Entrou} + \text{A Compensar}$ com precisão centesimal.
