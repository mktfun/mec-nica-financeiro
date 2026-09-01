# Proposal: Auditoria de Integridade de Saldos, Deduplicação OFX Multi-Dias e Ciclo Rede (314)

## Problema
1. **Distorção no Saldo Atual e Duplicação Contábil**: As conciliações diárias frequentemente apresentam divergências de saldo porque diferentes partes do sistema tentam calcular o saldo bancário de formas discrepantes (ex: o frontend somava apenas transações de crédito 	ype === in para achar o saldo da conta, ignorando o saldo patrimonial real <LEDGERBAL>).
2. **Contaminação por Extratos OFX Multi-Dias**: Ao subir um extrato bancário contendo lançamentos de múltiplos dias (D e D-1), o importador (CentralImportWizard.tsx) forçava a mesma 	arget_date em todas as transações, concentrando 4 depósitos da Rede (2 de ontem + 2 de hoje) no dia atual, duplicando as entradas e distorcendo a conciliação tripla.
3. **Trigger Legada Destrutiva**: Uma trigger legada no banco (update_reconciliation_bank_total) recalculava o ank_total para a soma de entradas menos saídas do dia a cada edição de transação, sobrescrevendo e corrompendo o saldo bancário patrimonial real.
4. **Dupla Contagem em Cartões a Compensar**: Vendas em cartão já liquidadas no mesmo dia entravam no saldo bancário (LEDGERBAL) e permaneciam simultaneamente em 
ao_entrou_valor, inflando o Caixa Atual.
5. **Divergência entre Dashboard e Painel de Conciliação**: A RPC get_dashboard_metrics usava fórmulas defasadas que omitiam o Cheque Especial e o dinheiro em cofre, exibindo números discordantes do Fechamento Diário.

---

## Solução Proposta (Foco em Reuso e Correção)

1. **[MODIFY] Parser & Importador Central (CentralImportWizard.tsx)**:
   - Respeitar a data individual <DTPOSTED> de cada transação OFX ao gravar 	arget_date = DATE(occurred_at).
   - Garantir que créditos de D-1 fiquem alocados em D-1 e créditos de D fiquem em D.
2. **[MODIFY] Limpeza e Blindagem do Banco (Supabase SQL Migration)**:
   - Dropar a trigger e função legada update_reconciliation_bank_total / update_bank_total_from_transactions.
   - Atualizar get_store_pos_triple_reconciliation para calcular 
ao_entrou_valor dinâmico (apenas vendas não liquidadas) e remover hardcodes legados de filiais.
   - Atualizar get_dashboard_metrics para espelhar a fórmula canônica dos 5 Pilares de get_daily_reconciliation_summary com dedução explícita de Cheque Especial.
3. **[MODIFY] Frontend & Hooks (useConciliacao.ts, useDashboardV2.ts, modulo1Calculations.ts, ResumoDiaPanel.tsx)**:
   - useModulo1StoresData: consumir o saldo bancário diretamente de 
econciliations.bank_total / RPC, eliminando o somatório incorreto de 	ype === in.
   - modulo1Calculations.ts & useDashboardV2.ts: garantir a dedução correta de saldo_negativo_itau no caixa_atual.
   - ResumoDiaPanel.tsx: proteger o upsert de 
econciliations para preservar o ank_total.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Encontradas:**
  - 
econciliations (armazena ank_total oficial por filial e data).
  - ofx_transactions (possui chave única (store_id, fitid) para deduplicação segura).
  - get_daily_reconciliation_summary (RPC autoritativa canônica com os 5 Pilares).
  - get_store_pos_triple_reconciliation (RPC de conciliação tripla, será corrigida e reaproveitada).
  - get_dashboard_metrics (RPC de métricas do dashboard, será alinhada).
- **Componentes / Hooks Existentes Encontrados:**
  - useConciliacao.ts e useModulo1StoresData (serão adaptados para consumir dados da RPC).
  - CentralImportWizard.tsx (será corrigido na atribuição de 	arget_date).
  - ResumoDiaPanel.tsx (será blindado no salvamento de snapshots).
- **Justificativa para Artefatos Novos:**
  - Zero novas tabelas. Zero novas RPCs duplicadas. Apenas 1 nova migration de correção cirúrgica [MODIFY] e ajustes nos arquivos existentes.

---

## Contratos de Dados & SQL (Supabase)

### 1. Eliminação da Trigger Destrutiva:
`sql
DROP TRIGGER IF EXISTS update_reconciliation_bank_total ON public.transactions;
DROP FUNCTION IF EXISTS public.update_bank_total_from_transactions();
`

### 2. Cálculo Canônico de Cartões a Compensar na RPC get_store_pos_triple_reconciliation:
`sql
-- nao_entrou_valor deve ser a diferença entre o líquido vendido e o que já entrou no extrato do dia:
nao_entrou_valor := GREATEST(0, COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0));
`

### 3. Alinhamento de Fórmulas dos 5 Pilares:
\\text{Saldo Bancos Positivo} = \\sum_{\\text{bank\\_total} > 0} \\text{bank\\_total}
\\text{Saldo Negativo (Cheque Especial)} = \\sum_{\\text{bank\\_total} < 0} |\\text{bank\\_total}|
\\text{Pilar 1 (Total Saldo Banco)} = \\text{Saldo Bancos Positivo} + \\text{Dinheiro em Lojas} + \\text{Cartões a Compensar} - \\text{Devoluções Rede}
\\text{Caixa Atual} = (\\text{Pilar 1} + \\text{Dinheiro MP} + \\text{A Receber} + \\text{Na Loja OS}) - \\text{Saldo Negativo Itaú}

---

## API & Componentes (Frontend)

- **CentralImportWizard.tsx**: Ajustar mapeamento de transações OFX para extrair 	arget_date = tx.date.split('T')[0].
- **useConciliacao.ts**: Alterar useModulo1StoresData para mapear saldo_banco_itau a partir de 
econciliations.bank_total ou do retorno da RPC.
- **ResumoDiaPanel.tsx**: Ao salvar o dia, garantir que ank_total da filial não seja anulado.

---

## Risco Principal e Mitigação

- **Risco Principal:** Re-importação de extratos antigos alterar datas de transações já conciliadas.
- **Mitigação:** O índice único (store_id, fitid) em ofx_transactions garante que transações já existentes sejam ignoradas (ON CONFLICT DO NOTHING), preservando qualquer classificação manual prévia.
