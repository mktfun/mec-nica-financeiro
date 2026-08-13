# Proposal: Correção de Matemática do Dashboard e Marco Zero (182)

## Problema
Após o usuário subir a planilha de Marco Zero, o preview apresenta os valores corretos (ex: Faturamento de 257k). Porém, ao entrar no Dashboard, os números quebram completamente (Faturamento dispara para 383k e o Fluxo de Caixa fica negativo em -154k).
A causa raiz é dupla:
1. **Double Counting no Faturamento:** A última migration (`20260813085500_fix_dashboard_math.sql`) removeu o filtro `AND source = 'ofx'` da soma de faturamento. Isso faz a `view transactions` somar depósitos de Maquininha, Rede E OFX juntos. Como o OFX já contém os depósitos de cartão, o valor dobra.
2. **Quebra de Sequência de Caixa:** O `MarcoZeroWizard` injeta o Caixa Atual no `daily_snapshots`, mas o Dashboard puxa o saldo bancário base iterando sobre a coluna `bank_total` da tabela `reconciliations`. Como o Marco Zero não cria uma reconciliação inicializando esse saldo em conta, o Dashboard "ignora" o caixa do Marco Zero e o Fluxo de Caixa despenca.

## Solução Proposta
1. **Migration (Correção de RPCs):** Restaurar a trava `AND source = 'ofx'` nas queries de Faturamento e Despesas (`get_dashboard_metrics` e `calculate_daily_conciliation`).
2. **Frontend (MarcoZeroWizard):** Fazer o assistente de Marco Zero gerar entradas reais na tabela `reconciliations` populando a coluna `bank_total` (com a proporção do caixa) para amarrar o fluxo contábil do sistema e evitar que o dashboard apague a implantação.

## Contratos de Dados
- Nenhuma nova tabela ou coluna.
- A view `transactions` permanece intacta.

## API / Interface
- `get_dashboard_metrics` (RPC) será alterado para recuperar precisão matemática.
- `calculate_daily_conciliation` (RPC) será alterado para não duplicar entradas das lojas.
- `MarcoZeroWizard.tsx` incluirá salvamento de `reconciliations.bank_total`.

## Features Existentes Impactadas
- Dashboard V2 (index)
- Cálculo Histórico de Fluxo de Caixa

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Parcialmente Reversível
- **Mitigação:** Como já identificamos os exatos selects SQL causando o problema, a correção atua pontualmente. Se o `MarcoZeroWizard` for acionado várias vezes, faremos upsert idempotente nas `reconciliations`.
