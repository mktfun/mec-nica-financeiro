# Design: Fix Match Engine (176)

## Arquitetura Técnica
A mudança ocorre puramente no nível do Banco de Dados PostgreSQL (via migration do Supabase).
1. `auto_match_transactions` será reescrito.
2. A restrição `DATE(closed_at) = p_date` na tabela `patio_os` muda para `DATE(closed_at) >= p_date - interval '3 days' AND DATE(closed_at) <= p_date`.
3. A restrição `occurred_at::date = p_date` na tabela `pos_transactions` muda para `occurred_at::date >= p_date - interval '3 days' AND occurred_at::date <= p_date`.
4. Ordenação incluída `ORDER BY DATE(closed_at) DESC` para priorizar OSs mais recentes.

## Interfaces TypeScript
(Sem alterações no Frontend)

## Componentes / Hooks / Funções
- **Migration Nova:** `20260812XXXXXX_fix_match_engine_date_window.sql` (contendo o `CREATE OR REPLACE FUNCTION`)

## Infra / Deploy 
A migration será gerada no Supabase. Como é um backend central, impacta instantaneamente as próximas importações após ser aplicada.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Importar uma Maquininha cuja venda foi no dia 10 e Extrato OFX cujo recebimento líquido caiu no dia 12. → A nova RPC deve encontrar e formar o par perfeitamente.
- **Cenário 2:** Dois lançamentos de exatos R$ 150,00 nos dias 10 e 11. O OFX cai no dia 12. → A ordenação DESC deve puxar e parear o do dia 11 primeiro.
