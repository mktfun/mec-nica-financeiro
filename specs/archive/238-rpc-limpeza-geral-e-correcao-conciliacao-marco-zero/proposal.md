# Proposta: RPC de Limpeza Geral Atômica & Correção da Conciliação de Marco Zero (Spec 238)

## 1. Diagnóstico dos Dois Problemas Reportados

### 💥 Problema 1: O Botão "Limpar Todos os Dados" deixava resíduos no banco
- **Causa Raiz Identificada:** A função `useClearAllData` no frontend executava `supabase.from(table).delete().neq('id', '...')` apenas para 10 tabelas, **esquecendo completamente as principais tabelas de transações**:
  - `ofx_transactions` (229 linhas continuavam presas no banco!)
  - `pos_transactions` (60 linhas de vendas da Rede continuavam no banco!)
  - `estoque_os_pendente` (986 ordens legadas continuavam no banco!)
  - `conciliation_daily_logs` e `dashboard_daily_logs`
- Além disso, exclusões diretas via client JS estão sujeitas a falhas silenciosas de RLS (Row Level Security).
- **Consequência:** Quando o usuário clicava em "Limpar", os 229 extratos bancários e 60 vendas da maquininha permaneciam no PostgreSQL, misturando dados antigos com as novas importações e corrompendo a conciliação.

---

### 💥 Problema 2: Marco Zero não contabilizando corretamente na conciliação
- **Causa Raiz Identificada:** A RPC `get_daily_reconciliation_summary` foi desenhada para buscar extratos em `ofx_transactions`. Porém, no **Marco Zero (14/08)**, não existem arquivos OFX individuais — os saldos bancários das 10 filiais (R$ 170.244,95) vêm da planilha consolidada gravada em `reconciliations` e `daily_snapshots`.
- Além disso, a busca por `Caixa Anterior` e `Faturamento Anterior` usava `WHERE date < p_date LIMIT 1`. No primeiro dia (Marco Zero), não existe dia anterior no banco, então a query retornava 0, ignorando o Caixa Anterior (R$ 258.736,15) e Faturamento Anterior (R$ 496.797,82) informados na planilha.

---

## 2. Solução Proposta

### 🧹 2.1 Nova RPC no PostgreSQL: `clear_all_financial_data()`
- Executa como `SECURITY DEFINER` e trunca com `CASCADE` **TODAS** as tabelas transacionais e operacionais do banco:
  - `ofx_transactions`
  - `pos_transactions`
  - `patio_os`
  - `estoque_os_pendente`
  - `reconciliations`
  - `reconciliacoes_triplas`
  - `daily_snapshots`
  - `dashboard_daily_logs`
  - `conciliation_daily_logs`
  - `conciliation_matches`
  - `manual_transactions`
  - `receivables`
  - `import_logs`
  - `import_batches`
  - `cash_registers`
  - `transactions`
  - `oficina_contas`
  - `oficina_os_cache`
- Conecta o botão "Limpar Todos os Dados" (`useClearAllData`) diretamente a esta RPC atômica, garantindo zeração 100% real e instantânea.

### 📐 2.2 Atualização da RPC `get_daily_reconciliation_summary` para Suporte Completo ao Marco Zero
- **Detecção de Marco Zero:** Se o dia consultado for Marco Zero (ou se não houver OFX):
  - `saldo_bancos_ofx` por loja vem de `reconciliations.bank_total` (totalizando os R$ 170.244,95 do Marco Zero).
  - `caixa_anterior` e `faturamento_anterior` são lidos diretamente do metadata do snapshot do Marco Zero (`(metadata->>'caixa_anterior')` e `(metadata->>'faturamento_anterior')`).
  - `faturamento_ofx` / Faturamento do Dia lê `daily_snapshots.faturamento` (R$ 76.187,25).
- **Para Dias Subsequentes (ex: 17/08):**
  - Lê automaticamente o `caixa_atual` e `faturamento` acumulado do Marco Zero como ponto de partida da esteira contábil.

---

## 3. Critérios de Aceite

1. ✅ Clicar em "Limpar Todos os Dados" zera **absolutamente todas as 17 tabelas transacionais** no PostgreSQL (0 linhas em `ofx_transactions`, 0 em `pos_transactions`, 0 em `patio_os`, etc.).
2. ✅ Ao importar o Marco Zero (`CONCILIAÇÃO 1408.xlsx`), o sistema exibe os valores exatos:
   - Saldo Bancos: R$ 170.244,95 (com cada uma das 10 filiais com seu saldo correto)
   - Dinheiro MP: R$ 13.066,00
   - A Receber: R$ 10.694,50
   - Na Loja OS: R$ 107.229,76
   - Caixa Atual: R$ 289.386,12
   - Caixa Anterior: R$ 258.736,15
   - Fluxo de Caixa: R$ 30.649,97
   - Faturamento do Dia: R$ 76.187,25
   - Contas do Dia: R$ 45.538,06
   - Diferença Final: -R$ 0,78 (Fechamento Conforme dentro da tolerância de ± R$ 50).
