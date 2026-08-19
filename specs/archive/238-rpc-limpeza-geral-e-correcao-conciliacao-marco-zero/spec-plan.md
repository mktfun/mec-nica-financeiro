# Spec Plan: RPC de Limpeza Geral Atômica & Sincronização de Marco Zero (Spec 238)

## 1. Escopo das Modificações

### 1.1 Banco de Dados PostgreSQL
- [x] Criar RPC `clear_all_financial_data()` com `SECURITY DEFINER` que executa `TRUNCATE TABLE ... CASCADE` em todas as 20 tabelas transacionais.
- [x] Corrigir casting de tipos em `process_marco_zero_import` (`v_target_date date := p_target_date::date`), e persistir `saldo_bancario` e `total_patio` reais no `daily_snapshots`.
- [x] Ajustar `get_daily_reconciliation_summary` para compatibilidade com dias de Marco Zero (`is_marco_zero = true`).

### 1.2 Frontend / Parser
- [x] Conectar `useClearAllData` em [`src/hooks/useImportProcessor.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useImportProcessor.ts) para invocar `clear_all_financial_data`.
- [x] Atualizar [`src/lib/parsers/marcoZeroParser.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/parsers/marcoZeroParser.ts) para extrair saldos das 10 lojas em formato multi-linha e acumular `saldoBancos` e `totalPatio`.

---

## 2. Plano de Testes & Validação

- [x] Consulta direta no PostgreSQL provando 0 linhas em todas as 16 tabelas após chamar `clear_all_financial_data()`.
- [x] Teste de importação de Marco Zero provando status `success` na RPC e gravação fiel em `daily_snapshots`.
- [x] Teste de consulta em `get_daily_reconciliation_summary` validando os 5 pilares do Marco Zero.
- [x] Build de produção (`npm run build`) validado com código 0.
