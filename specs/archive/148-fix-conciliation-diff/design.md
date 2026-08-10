# Design: Corrigir Matemática da Conciliação e Restaurar Histórico de OS (148-fix-conciliation-diff)

## Arquitetura Técnica
A RPC `calculate_daily_conciliation` (que re-calcula os valores de fechamento por loja para uma data específica) será atualizada para ler dados em modo híbrido (Snapshot + Real-Time):

1. **Leitura de `Na Loja OS`**:
   - `SELECT na_loja_os FROM reconciliations WHERE store_id = X AND date = p_date`
   - Se o valor existir (é um dia passado que já foi fechado/importado), a variável assume esse valor histórico.
   - Apenas se for `NULL` (dia de hoje sem fechamento), o cálculo vai para a `patio_os` subtrair `total_value - paid_value`.

2. **Leitura de `Previsto OFX` por Loja**:
   - O OFX original de recebimento não tem `store_id` (é NULL).
   - O novo motor de pareamento marca a coluna `matched_os_number` de `ofx_transactions` com valores como `'BATCH_DP'`, `'BATCH_CDB'`, ou vincula a OSs via `matched_ofx_id`.
   - O cálculo do Previsto OFX da loja 'DP' vai procurar:
     - 1) OFX com `store_id = 'DP'` (caso exista manualmente)
     - 2) OFX com `matched_os_number = 'BATCH_DP'`
     - 3) OFX que tenha sido pareado no Pátio OS: `SELECT id FROM patio_os WHERE store_id = 'DP' AND matched_ofx_id IS NOT NULL`
   - Esses valores somados representarão a parcela do dinheiro do Itaú que de fato "desceu" para aquela filial específica.

## Componentes / Hooks / Funções
- **`supabase/migrations/xxxx_fix_daily_conciliation_math.sql`**: Nova migration corrigindo o script da function PL/pgSQL `calculate_daily_conciliation`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Consulta de Data Antiga 05/08)**:
  - Condição: A OS já foi 100% paga (restante 0) em 07/08. 
  - Ação: O app puxa `calculate_daily_conciliation('2026-08-05')`.
  - Verificação: Em vez de ler a OS hoje (que dá 0), ele lê o valor exato salvo na `reconciliations` no dia 05/08 (ex: R$ 4.979,52).
- **Cenário 2 (Diferença de Previsto OFX)**:
  - Condição: Entrou 13k no Itaú (global). Foi pareado `BATCH_DP` pelo auto-match.
  - Ação: A conciliação calcula a "Diferença" da loja DP.
  - Verificação: `Previsto OFX` da DP absorve os 13k. `Maquininha` tem 13k. `Diferença` fecha em `R$ 0,00` e não mais `-120k`.
