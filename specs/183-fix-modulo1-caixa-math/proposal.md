# Proposal: Correção de Cálculo de Caixa Atual e Divergência na Conciliação Diária (183)

## Problema
Na tela de Conciliação Diária (`/conciliacao`), a Consolidacão do Dia exibe um valor absurdo de Diferença Final de **-R$ 1.405.183,14**.
A causa raiz é a inclusão indevida do valor das OSs pendentes do pátio (`NA LOJA OS`, R$ 1.502.709,92) na fórmula do `caixa_atual` dentro de `src/lib/modulo1Calculations.ts`.

Carros em atendimento/manutenção no pátio da oficina (`NA LOJA OS`) representam veículos e serviços pendentes, **NÃO sendo caixa líquido nem dinheiro em conta**. 
Ao somar 1.5 milhão ao Caixa Atual:
1. O `Caixa Atual` salta falsamente para **R$ 1.544.025,15**.
2. O `Fluxo de Caixa` (`caixa_atual - caixa_anterior`) salta para **R$ 1.544.025,15**.
3. O `Valor Disponível para Contas` (`faturamento - fluxo_cx`) cai para **-R$ 1.402.559,45**.
4. A `Diferença Final` estoura para **-R$ 1.405.183,14**.

Enquanto a RPC do backend SQL (`get_dashboard_metrics`) já havia sido corrigida para NÃO somar o pátio no Caixa Atual (`v_caixa_atual := v_saldo_total + v_dinheiro_mp + v_a_receber;`), a biblioteca utilitária do frontend (`modulo1Calculations.ts`) permaneceu com a fórmula legada quebrada (`const caixa_atual = saldo + dinheiro_mp + a_receber + na_loja;`).

## Solução Proposta
1. **Frontend (`src/lib/modulo1Calculations.ts`):** 
   - Remover a variável `na_loja` da soma do `caixa_atual` na função `calculateGlobalConciliacao`.
   - A fórmula oficial passará a ser rigorosamente: `caixa_atual = saldo + dinheiro_mp + a_receber`.
   - Ajustar `calculateModulo1Saldo` para garantir a mesma equivalência na visão de módulo/lojas (`g17 = g13 + g14 + g15`).

## Contratos de Dados
- Nenhuma alteração em schema ou tabelas.
- O campo `na_loja_os` continua sendo lido e exibido no card visual e no Raio-X, mas deixa de contaminar o Caixa Atual e o Fluxo de Caixa.

## API / Interface
- `calculateGlobalConciliacao` em `src/lib/modulo1Calculations.ts`
- `calculateModulo1Saldo` em `src/lib/modulo1Calculations.ts`

## Features Existentes Impactadas
- Tela de Conciliação Diária (`/conciliacao`)
- Painel `ResumoDiaPanel.tsx`
- Painéis de conciliação por loja

## Risco Principal
- **Probabilidade:** Mínima
- **Impacto:** Totalmente Reversível
- **Mitigação:** Trata-se de uma correção pura de fórmula no frontend para alinhar a matemática do cliente com a do servidor.
