# Proposal: Cadeia de ConciliaçÁo Quádrupla (OS × Maquininha × PIX × Extrato OFX) e Baixa Automática 'ENTROU' (conciliacao-quadrupla-entrou)

## Problema
Atualmente, as OSs cadastradas no pátio, os extratos da maquininha (Rede) e os lançamentos do extrato bancário (OFX) sÁo conciliados em visões isoladas na tela de conciliaçÁo. Falta a **regra de fechamento em cadeia das 4 pontas**, onde:
1. O gerente registra a OS e detalha as formas de pagamento (ex: Crédito R$ 1.718,45 + PIX R$ 385,00).
2. O sistema cruza a parcela de cartÁo com a maquininha e a parcela de PIX/depósito com o extrato OFX na janela $D0/D-1$.
3. **Falta a Baixa Automática de Status 'ENTROU':** Apenas quando as pontas fecham com a maquininha e o banco, a OS deve ter o seu status atualizado automaticamente para `ENTROU` (zerando o valor pendente "Na Loja" e impactando o cálculo do saldo realizado no Módulo 1 da planilha `CONCILIACAO-2307.xlsx`).

## SoluçÁo Proposta
Implementar o **Motor de Fechamento Quádruplo de ConciliaçÁo (`QuadrupleConciliationEngine`)**:

1. **ValidaçÁo da Cadeia Completa em 4 Pontas (Segmentada por Loja e Janela D0/D-1):**
   - **Ponta 1 (OS do Gerente):** Lê o fracionamento de pagamentos da OS (`parsed_credit_debit` + `parsed_pix_transfer`).
   - **Ponta 2 (Maquininha):** Valida se o valor de cartÁo bateu com os recebíveis da máquina (via motor em camadas exato + subset-sum).
   - **Ponta 3 (Banco OFX):** Valida se o valor líquido da maquininha E o valor de PIX caíram no extrato bancário OFX.
   - **Ponta 4 (Baixa Automática 'ENTROU'):** Se as 3 pontas anteriores fecharem com 100% de exatidÁo, o status da OS no banco de dados é atualizado automaticamente para `ENTROU` (campo `status = 'ENTROU'`), registrando o log de fechamento em `patio_os`.

2. **Reflexo nos Saldos e Totais (Réplica do Módulo 1 da Planilha):**
   - **Soma 'NA LOJA' (Aba OS):** Soma apenas OSs com status em aberto/pendente (`status != 'ENTROU'`). Quando a OS é marcada como `ENTROU`, seu valor zerado sai do "Na Loja" e é consolidado no caixa realizado.
   - **Indicador de Status 'ENTROU' por OS:** Na tabela de conciliaçÁo por loja e no Modal de Detalhes da OS, exibir o selo de fechamento quádruplo `✅ ENTROU (Fechamento 100%)`.

## Contratos de Dados
- **Tabela `patio_os`**:
  - AtualizaçÁo do campo `status`: transita de `'ABERTO'` ou `'PENDENTE'` para `'ENTROU'` quando a conciliaçÁo quádrupla é concluída.
  - Registro no campo `history_log` (JSONB) do timestamp e lote que realizou a baixa automática.
- **Tabela `conciliation_matches`**:
  - Armazena a chave quádrupla: `store_id`, `os_number`, `rede_transaction_id`, `ofx_transaction_id`, `target_date`, `match_status = 'ENTROU'`.

## Features Existentes Impactadas
- `src/hooks/useConciliacao.ts` (`useReconciliationViews` / motor de baixa quádrupla)
- `src/components/conciliacao/OsVsRedeTable.tsx` (ExibiçÁo do badge `ENTROU`)
- `src/components/conciliacao/OsDetailModal.tsx` (Status e histórico da baixa em 4 pontas)
- `src/routes/conciliacao.$lojaId.tsx` (Totais de saldo realizado vs pendente na loja)

## Risco Principal
Garantir que a transiçÁo de status para `ENTROU` seja **idempotente** (executável múltiplas vezes sem duplicar baixas ou zerar OSs indevidamente se a planilha for reimportada).
*MitigaçÁo:* Usar mutações com verificaçÁo de integridade e checagem de chave única em `conciliation_matches`.
