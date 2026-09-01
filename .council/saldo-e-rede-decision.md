# Decisão do Conselho Técnico Deliberativo

**Tema:** Integridade do Saldo Bancário, Resolução de Duplicações Contábeis, Janela Multi-Dias do OFX e Ciclo de Liquidação da Rede
**Data:** 01/09/2026

---

## 🎭 Rodada 1 — Posições das Personas

### 1. O Pragmático
- **Diagnóstico:** O sistema está tentando calcular saldo em 4 lugares diferentes (em useConciliacao.ts, em useDashboardV2.ts, na trigger SQL legada e na RPC). Pior: o frontend em useConciliacao somava apenas 	ype === in para achar o saldo do banco!
- **Solução Pragmática:** 
  1. Destruir a trigger legada update_reconciliation_bank_total que corrompe o LEDGERBAL.
  2. Corrigir o CentralImportWizard.tsx para usar 	arget_date = DATE(DTPOSTED) em vez da data global do wizard.
  3. Fazer o frontend consumir 100% dos saldos e totais direto da RPC canônica get_daily_reconciliation_summary. Menos código no client, zero divergência.

### 2. O Cético
- **Diagnóstico:** A maior vulnerabilidade está na falta de idempotência. Se o operador salvar a conciliação 3 vezes ou importar o OFX duas vezes, os valores não podem se multiplicar. Além disso, se a Rede creditou hoje uma venda de hoje (antecipação), o valor entra no saldo do banco e não pode ser somado novamente em 'A Compensar' (
ao_entrou_valor).
- **Solução Cética:**
  1. No get_store_pos_triple_reconciliation, 
ao_entrou_valor deve ser rigorosamente SUM(net_amount) WHERE settlement_status != 'entrou' AND transaction_type != 'devolucao'.
  2. Blindagem de upsert em 
econciliations: nunca enviar payload sem ank_total no frontend.
  3. Deduplicação em ofx_transactions via índice único (store_id, fitid) com ON CONFLICT DO NOTHING.

### 3. O Arquiteto
- **Diagnóstico:** Violação flagrante do princípio *Single Source of Truth* (SSOT). Temos get_dashboard_metrics com a fórmula antiga e get_daily_reconciliation_summary com a fórmula nova de 27/08.
- **Solução Arquitetural:**
  1. Unificar get_dashboard_metrics para invocar ou espelhar a matemática dos 5 Pilares de get_daily_reconciliation_summary.
  2. Fórmulas Canônicas Universais:
     - $	ext{Saldo Bancos Positivo} = \sum_{	ext{bank\_total} > 0} 	ext{bank\_total}$
     - $	ext{Saldo Negativo (Cheque Especial)} = \sum_{	ext{bank\_total} < 0} |	ext{bank\_total}|$
     - $	ext{Pilar 1 (Total Saldo Banco)} = 	ext{Saldo Bancos Positivo} + 	ext{Cofre} + 	ext{Cartões a Compensar} - 	ext{Devoluções}$
     - $	ext{Caixa Atual} = (	ext{Pilar 1} + 	ext{Dinheiro MP} + 	ext{A Receber} + 	ext{Na Loja OS}) - 	ext{Saldo Negativo Itaú}$
  3. Ciclo Temporal do Cartão: Venda D entra em Cartões a Compensar de D. No D+1, ao cair no extrato OFX de D+1, ela alimenta o ank_total de D+1 e baixa a pendência de D.

### 4. O Advogado do Diabo
- **Diagnóstico:** E os fusos horários e datas de corte? Transações OFX feitas às 23:00 podem vir com UTC do dia seguinte. E se o extrato do Itaú trouxer transações de 30 dias atrás?
- **Solução Robusta:**
  1. Extração estrita de data local YYYY-MM-DD a partir do <DTPOSTED>.
  2. Trava de partição: se a transação do OFX for de data $, ela é persistida com 	arget_date = X.
  3. O ank_total gravado em 
econciliations pertence à data do extrato selecionado ou à data máxima das transações (MAX(DTPOSTED)).

---

## ⚖️ Rodada 2 — Refutação Cruzada e Trade-offs

- **Cético vs Pragmático:** O Pragmático propôs apenas mudar o frontend, mas o Cético provou que a trigger no banco update_reconciliation_bank_total regrava o saldo com o delta diário no momento em que qualquer transação é editada. **Consenso:** É obrigatório remover a trigger no banco E corrigir o frontend.
- **Arquiteto vs Advogado do Diabo:** O Arquiteto queria forçar match 1:1 estrito entre cada NSU e cada linha do extrato. O Advogado do Diabo refutou lembrando que o Itaú agrupa depósitos da Rede por modalidade/bandeira (ex: lote Rede Mastercard + lote Rede Visa). **Consenso:** O match de maquininhas na conciliação tripla deve ser por agrupamento diário filial/adquirente (ofx_maquininhas vs 
ede_liquido), permitindo baixa total ou parcial transparente.

---

## 🏁 Rodada 3 — Síntese Final e Decisão do Conselho

**Decisão Unânime:** **GO (Aprovado com 5 Pilares de Correção)**

1. **[BACKEND] MIGRATION DE BLINDAGEM**:
   - DROP TRIGGER IF EXISTS update_reconciliation_bank_total ON transactions;
   - DROP FUNCTION IF EXISTS update_bank_total_from_transactions();
   - Atualizar get_store_pos_triple_reconciliation removendo hardcodes e calculando 
ao_entrou_valor dinâmico.
   - Alinhar get_dashboard_metrics com a fórmula dos 5 Pilares e dedução explícita de Cheque Especial.

2. **[PARSER & IMPORTAÇÃO] PARTIÇÃO TEMPORAL**:
   - No CentralImportWizard.tsx, atribuir 	arget_date = tx.date.split('T')[0] em cada transação OFX individual.
   - Prevenir a contaminação do dia D com transações de D-1.

3. **[FRONTEND] REMOÇÃO DE CÁLCULOS PARALELOS**:
   - Em useConciliacao.ts (useModulo1StoresData), remover a soma manual de 	ype === 'in' e vincular diretamente a 
econciliations.bank_total / RPC.
   - Em useDashboardV2.ts e modulo1Calculations.ts, garantir a dedução de saldo_negativo_itau e inclusão de 
a_loja_os.
   - Em ResumoDiaPanel.tsx, proteger o upsert de 
econciliations para nunca zerar o ank_total.

4. **[IDEMPOTÊNCIA & DEDUPLICAÇÃO]**:
   - Garantir que re-conciliar, re-salvar ou re-importar qualquer data seja 100% determinístico e idempotente.
