# Plano de Implementação: Spec 234

## 📋 Checklist de Tarefas

### Fase 1: Banco de Dados PostgreSQL & RPCs
- [ ] Mapear todas as bandeiras OFX (`REDE MAST`, `REDE VISA`, `REDE ELO`, `REDE AMEX`) agrupando por loja e data.
- [ ] Adicionar colunas `settlement_status` e `settled_target_date` na tabela `pos_transactions` com valor default `'nao_entrou'`.
- [ ] Criar RPC de Conciliação Tripla cruzando `pos_transactions` (Líquido Rede) vs `ofx_transactions` (Soma das Bandeiras) vs `patio_os` (Pagamentos em Cartão).
- [ ] Atualizar a RPC `get_daily_reconciliation_summary(p_date)` para somar `cartoes_a_compensar` ao Saldo Bancário e expurgar duplicações de faturamento em liquidações.
- [ ] Criar RPC `admin_toggle_pos_settlement_status(p_transaction_id, p_new_status)` para ajustes manuais caso o operador deseje.

### Fase 2: Hooks & Frontend
- [ ] Atualizar `useConciliacao.ts` e `useDailySnapshot.ts` para receber `cartoes_a_compensar`, `saldo_bancos_ofx` e `maquininhas_por_loja`.
- [ ] Atualizar `ResumoDiaPanel.tsx` estilizando o Card do Pilar 1 com os sub-valores:
  - Saldo Bancos (OFX)
  - Maquininhas Não Entradas (Cartões a Compensar)
  - Saldo Consolidado
- [ ] Criar componente `MaquininhasDetailModal.tsx` com a listagem loja a loja e comparativo Rede (Visa+Master) vs OFX vs OSs.
- [ ] Atualizar o hook de diagnóstico analítico `useReconciliationInsights.ts` para refletir o status exato das maquininhas e OSs vinculadas.

### Fase 3: Validação & Testes
- [ ] Testar com os dados do dia 17/08 (`C:\Users\admin\Desktop\conciliacao\17-08`) e verificar o fechamento exato dos 5 pilares.
- [ ] Validar `npm run build`.
- [ ] Git commit e push das alterações.
