# Design: Correção de Matemática do Dashboard e Marco Zero (182)

## Arquitetura Técnica
`CentralImportWizard` / `MarcoZeroWizard` → `transactions` & `reconciliations` → `get_dashboard_metrics` → `DashboardV2`

- O Assistente de Marco Zero fará um insert/upsert na tabela `reconciliations`, definindo `bank_total` igual ao `caixa_atual` importado, para que as rotinas do Dashboard encontrem esse saldo inicial.
- A procedure `get_dashboard_metrics` será corrigida para restringir a soma de Faturamento e Despesas apenas aos registros `source = 'ofx'`, evitando somar depósitos de cartão de crédito duplicados (que já estão presentes no extrato OFX).

## Interfaces TypeScript
Nenhuma nova interface. Utilizaremos o esquema atual.

## Componentes / Hooks / Funções
- **Backend (Supabase Migration):**
  - Alteração na função SQL `get_dashboard_metrics` (adicionando `AND source = 'ofx'`).
  - Alteração na função SQL `calculate_daily_conciliation` (adicionando `AND source = 'ofx'`).
- **Frontend:**
  - `src/components/importacoes/MarcoZeroWizard.tsx`: Adicionar upsert em `reconciliations` salvando o `bank_total` correspondente na variável `data.global.negativo` ou `data.global.caixaAnterior`. (Será validado de onde exatamente vem o saldo).

## Fluxo de UI
1. Usuário arrasta planilha Marco Zero.
2. Sistema salva OSs e Saldo. (Invisivelmente, cria a `reconciliation` raiz).
3. Usuário vai para o Dashboard no mesmo dia.
4. Dashboard puxa o `bank_total` da `reconciliation` e o `v_saldo_total` fica exato.
5. Faturamento não é duplicado, mantendo a consistência visual com a planilha importada.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Marco Zero importado → Entrar no Dashboard do mesmo dia → Caixa Atual bate perfeitamente com o preview e Fluxo de Caixa não fica negativo.
- **Cenário 2:** Importação Centralizada no mesmo dia → Transações IN da Maquininha e OFX são inseridas → Faturamento Atual não deve ser o dobro, mas sim exatamente o valor do OFX.
