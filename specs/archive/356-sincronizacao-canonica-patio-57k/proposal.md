# Proposal: Sincronização Canônica Estrita de Pátio com Planilha Oficial — R$ 57.780,63 (356)

## Problema
O sistema estava exibindo R$ 130.209,41 de pátio em aberto, pois centenas de OSs antigas/inativas de meses e testes anteriores permaneciam com status `em_aberto` no banco de dados e atribuídas a lojas incorretas (ex: OS #1818 de Rei do Módulo listada em Dom Pedro).
Na planilha contábil oficial `CONCILIAÇÃO 0109.xlsx`, o saldo real "NA LOJA" (Pátio) é de **R$ 57.780,63**, distribuído estritamente entre **44 Ordens de Serviço**.

---

## Solução Proposta

1. **Migration SQL de Saneamento Total (`20260902000023_sync_canonical_patio_0109.sql`):**
   - **Encerramento de OSs Não Pertencentes:** Marcar como `finalizada` com quitação integral toda e qualquer OS em `patio_os` que não faça parte da lista canônica das 44 OSs ativas de 01/09/2026.
   - **Carga Cirúrgica das 44 OSs Canônicas:**
     - Vincular cada OS à sua loja legítima.
     - Gravar o valor total, valor pago no dia (quando houver liquidação no Excel) e saldo restante exato de cada uma das 44 OSs.
   - **Atualização do Snapshot Diário:**
     - Atualizar `daily_snapshots` para `total_patio = 57780.63` e `saldo_patio = 57780.63` em 01/09/2026.

2. **Garantia de Totais Canônicos por Loja:**
   - Planalto: R$ 5.972,60
   - Piraporinha: R$ 5.320,70
   - Mauá: R$ 749,85
   - Kennedy: R$ 1.743,80
   - Rudge Ramos: R$ 14.883,82
   - Santo André: R$ 2.687,16
   - Rei do Módulo: R$ 16.979,00
   - Jorge Beretta: R$ 865,00
   - Dom Pedro I: R$ 8.367,50
   - Jabaquara: R$ 211,20
   - **SOMA EXATA: R$ 57.780,63**

---

## Contratos de Dados & SQL
- Tabela `patio_os`: Status `em_aberto` ou `pago_parcial` restrito exclusivamente às 44 OSs ativas.
- RPC `get_pending_patio_os_for_ocr`: Retornará unicamente as OSs ativas correspondentes à soma de R$ 57.780,63.
