# Proposal: Reestruturação dos Cards de Fechamento por Loja e Resumo Diário Consolidado (redesign-conciliacao-cards-and-daily-summary)

## Problema

1. **Cards por Loja Poluídos com Campos Zerados e Nomes Inadequados:**
   - Os cards de "Fechamento por Loja" em `/conciliacao` exibiam rótulos confusos como "Dinheiro MP" (R$ 0,00) e "A Receber" (R$ 0,00), que poluiam a tela e não traziam utilidade prática.
   - O campo "Banco Itaú" exibia "Entradas" em vez de esclarecer se era o Faturamento do Itaú ou o Saldo Real.
   - Faltava a exibição limpa e direta do **Faturamento**, **Maquininha (Rede)**, **PIX (OS)**, **Na Loja OS (Em Aberto)**, **Banco Itaú (Saldo)** e **Diferença**.

2. **Divergência e Saldo Zerado no Painel Hero Topo ("Conciliação Diária"):**
   - O painel de topo não estava somando os saldos atuais acumulados (último saldo OFX importado) de todas as lojas, mostrando `R$ 0,00` quando a data selecionada não tinha arquivo OFX recém-enviado.
   - Faltava o agrupamento transparente do Faturamento Consolidado, Maquininha, PIX do dia, Taxas/Juros de cartão e Saldo Bancário Consolidado.

## Solução Proposta

1. **Reformulação do Card "Fechamento por Loja" (`src/routes/conciliacao.index.tsx`):**
   - **Remover:** Cartões "Dinheiro MP" e "A Receber".
   - **Exibir 6 Métricas Claras:**
     1. **Faturamento Sistema / OS:** Apurado do sistema no dia.
     2. **Maquininha:** Vendas de cartão Rede no dia.
     3. **PIX:** Valor recebido via PIX nas OSs do dia.
     4. **Na Loja OS:** Total em aberto no Pátio daquela loja.
     5. **Banco Itaú (Saldo):** Saldo real acumulado importado via OFX daquela loja.
     6. **Diferença:** Diferença entre Faturamento e (Maquininha + PIX).

2. **Ajuste do Painel Consolidado Topo (`src/components/conciliacao/ResumoDiaPanel.tsx`):**
   - **Saldo Itaú Consolidado:** Somar o último saldo real importado do extrato OFX de cada loja (não zerar em dias sem novo upload).
   - **Totalizadores do Dia:** Exibir Faturamento Consolidado, Maquininha Total, PIX Total, Taxas/Juros da Maquininha e Diferença Global.

## Contratos de Dados
- Hooks `useDailyBankBalance`, `useModulo1StoresData`, `useConciliacaoResumo`

## Features Existentes Impactadas
- `src/routes/conciliacao.index.tsx`
- `src/components/conciliacao/ResumoDiaPanel.tsx`
- `src/hooks/useTransactions.ts`

## Risco Principal
O cálculo do saldo OFX acumulado zerar se for buscado estritamente pela data selecionada.
*Mitigação:* Buscar o último saldo de extrato registrado (`bank_total` / `rawBalance`) para cada loja, independente da data selecionada.
