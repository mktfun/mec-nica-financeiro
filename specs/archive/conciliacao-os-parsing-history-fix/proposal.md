# Proposal: Ajuste no Importador e Motor de ConciliaçÁo Módulo 2 — OS Bruta, Status Finalizado, Busca Histórica e Trava Anti-DuplicaçÁo (conciliacao-os-parsing-history-fix)

## Problema
1. **OSs com Valor Zerado no Cruzamento ($OS \leftrightarrow Maquininha$):** Quando uma OS é quitada ou finalizada na planilha/sistema de gestÁo, seu saldo pendente torna-se `R$ 0,00`. O motor de conciliaçÁo estava usando esse saldo zerado (`0.00`) para bater com a Maquininha (Rede) em vez do **Valor Bruto em CartÁo (`credit_debit_value` / `total_value`)**. Com isso, uma OS finalizada de R$ 3.385,00 parecia valer R$ 0,00 no cruzamento.
2. **Filtro Rígido de Data e Status Finalizado:** As consultas anteriores ignoravam OSs finalizadas em dias anteriores (ex: dia 21). Como o dinheiro entra no banco dias depois, o sistema nÁo encontrava a OS correspondente.
3. **Risco de DuplicaçÁo em Conciliações Futuras (Exigência do Usuário):** Se uma OS já foi pareada hoje e baixada (`status = 'ENTROU'`), se amanhÁ entrar outro depósito de R$ 380,00 no extrato, o sistema **NÁO pode re-parear** a OS antiga do dia anterior. O depósito de amanhÁ só deve bater com uma **OS nova pendente** dos arquivos novos. Se a OS ficar pendente, é porque houve erro real de cobrança do gerente no pátio.

## SoluçÁo Proposta

1. **Uso do Valor Bruto em CartÁo (`credit_debit_value` / `total_value`):**
   - O cruzamento $OS \leftrightarrow Maquininha$ usará sempre o valor bruto em cartÁo cobrado na OS (`3.385,00`), NUNCA o saldo em aberto zerado.

2. **Trava Anti-DuplicaçÁo por Chave Única de Match (`conciliation_matches`):**
   - OSs que já possuem um match confirmado e registrado em `conciliation_matches` (ou com `status = 'ENTROU'`) sÁo **automaticamente excluídas** do pool de candidatas a novos pareamentos.
   - Novas entradas de extrato no dia seguinte só poderÁo parear com novas OSs pendentes dos lotes recentes.

3. **Busca Histórica de OSs Pendentes sem RestriçÁo Rígida de Data:**
   - `useReconciliationViews` buscará todas as OSs da loja que **ainda nÁo foram baixadas/conciliadas** (`status != 'ENTROU'`), independente da data de abertura (`opened_at`), permitindo que a maquininha de hoje bata com a OS do dia 21.

4. **Regex Avançado de Pagamentos (`useOsImportProcessor.ts`):**
   - Captura precisa de padrões como `Credito: 3385.00`, `Credito: 1718.45; PIX: 385.00`, `CartÁo: 500`.

## Contratos de Dados
- **Tabela `conciliation_matches`**:
  - Garante a chave composta de controle: `store_id`, `os_number`, `rede_transaction_id`, `ofx_transaction_id`.
  - Impede a reutilizaçÁo de OSs já conciliadas.
- **Tabela `patio_os`**:
  - `status`: ao receber `'ENTROU'`, a OS é marcada como concluída e desativada para pareamentos futuros.

## Features Existentes Impactadas
- `src/hooks/useOsImportProcessor.ts` (Parsing e regex de pagamentos em XLS/CSV)
- `src/hooks/useImportProcessor.ts` (Persistência e upsert de `patio_os`)
- `src/hooks/useConciliacao.ts` (`useReconciliationViews` e trava anti-duplicaçÁo)
- `src/components/conciliacao/OsVsRedeTable.tsx` (ExibiçÁo e pareamento de OSs)

## Risco Principal
Garantir que a trava anti-duplicaçÁo nÁo bloqueie reimportações legítimas de correçÁo pelo usuário.
*MitigaçÁo:* Se o usuário rodar "Limpar Dados do Lote", a trava é liberada junto com a purga do cache.
