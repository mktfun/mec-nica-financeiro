# 🏛️ Conselho Deliberativo: Alinhamento Canônico de Pátio com a Planilha Oficial (R$ 57.780,63)

**Data:** 02/09/2026  
**Problema:** O sistema exibia R$ 130.209,41 de pátio em aberto porque a tabela `patio_os` continha centenas de OSs residuais de meses e testes passados associadas a lojas erradas ou que já não existiam no pátio físico. Na planilha oficial `CONCILIAÇÃO 0109.xlsx`, o saldo real "NA LOJA" é de **R$ 57.780,63**, composto por exatamente **44 OSs**.

---

## Rodada 1 — Posições das Personas

1. **O Pragmático:**
   - A planilha oficial de 01/09/2026 possui exatamente 44 OSs divididas nas 10 lojas que somam os R$ 57.780,63.
   - Qualquer OS que não esteja nesta lista deve ter seu status encerrado como `finalizada` com data anterior a 01/09/2026 para expurgar o pátio ativo imediatamente.

2. **O Cético:**
   - Devemos garantir que os `store_id` estejam rigorosamente corretos (ex: OS #1818 pertence a Rei do Módulo, jamais a Dom Pedro; OS #8762 pertence a Rudge Ramos).
   - O `total_patio` no `daily_snapshots` do dia 01/09/2026 deve ser gravado com R$ 57.780,63.

3. **O Arquiteto:**
   - Criar uma migration SQL idempotente de saneamento total (`20260902000023_sync_canonical_patio_0109.sql`):
     1. Marcar como `finalizada` toda e qualquer OS em `patio_os` cuja numeração não esteja entre as 44 OSs ativas de 01/09/2026.
     2. Fazer o upsert cirúrgico das 44 OSs com loja, data, valor total, pago, restante e forma de pagamento correspondente.
     3. Atualizar `daily_snapshots` para que `total_patio = 57780.63`.

4. **O Advogado do Diabo:**
   - Tratar OSs com valor negativo ou zerado no Excel (ex: OSs já quitadas no dia entram como quitadas).

---

## Rodada 2 — Consenso e Decisão

1. **Expurgo de Resíduos:**
   - Executar `UPDATE patio_os SET status = 'finalizada', paid_value = total_value WHERE os_number NOT IN (...)`.
2. **Sincronização Canônica das 44 OSs:**
   - Planalto (5 OSs) -> Aberto: R$ 5.972,60
   - Piraporinha (6 OSs) -> Aberto: R$ 5.320,70
   - Mauá (5 OSs) -> Aberto: R$ 749,85
   - Kennedy (2 OSs) -> Aberto: R$ 1.743,80
   - Rudge Ramos (11 OSs) -> Aberto: R$ 14.883,82
   - Santo André (6 OSs) -> Aberto: R$ 2.687,16
   - Rei do Módulo (8 OSs) -> Aberto: R$ 16.979,00
   - Jorge Beretta (1 OS) -> Aberto: R$ 865,00
   - Dom Pedro I (8 OSs) -> Aberto: R$ 8.367,50
   - Jabaquara (1 OS) -> Aberto: R$ 211,20
   - **TOTAL CANÔNICO DE PÁTIO EM ABERTO: R$ 57.780,63**
