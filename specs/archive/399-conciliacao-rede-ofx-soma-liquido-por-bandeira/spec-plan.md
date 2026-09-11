# Spec Plan: Conciliação Rede x OFX por Soma de Líquido por Bandeira (399)

## Tasks

- [x] [BACKEND] Executar migration no Supabase adicionando coluna `brand` e índice em `pos_transactions`
- [x] [BACKEND] Atualizar trigger `insert_into_transactions_view` para propagar campo `brand`
- [x] [ENGINE] Refatorar `ReconciliadorRedeOFX` para somar líquidos de vendas por bandeira e cruzar com extrato OFX
- [x] [INGESTION] Garantir envio e persistência de `brand` em `CentralImportWizard.tsx`
- [x] [UI] Atualizar `Step4FinalAuditAndClose.tsx` para passar `brand` ao motor de conciliação
- [x] [DATA-FIX] Atualizar as 5 transações de Dom Pedro em 10/09 no banco para `brand` correto e `settlement_status = 'entrou'`
- [x] [TEST] Rodar script de auditoria e validação determinística de Dom Pedro e Piraporinha
- [x] [TEST] Executar `npm run build` e validar fechamento contábil centesimal sem duplicação de saldo
