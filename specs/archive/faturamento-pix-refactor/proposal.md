# Proposal: Refatoração do Faturamento e PIX na Conciliação Diária (faturamento-pix-refactor)

## Problema
Atualmente, no dashboard por loja, o valor de **PIX** exibido soma indiscriminadamente todos os valores declarados como PIX nas OSs (Ordens de Serviço), independentemente de terem entrado de fato no banco ou não. Além disso, o **Faturamento** está exibindo o somatório total bruto das OSs ativas, inflando os números (exibindo mais de 130 mil) em vez de refletir as receitas confirmadas do dia (Maquininha + PIX bancário conciliado).

## Solução Proposta
Ajustar a lógica do hook `useModulo1StoresData` em `src/hooks/useConciliacao.ts` para que:
1. **PIX:** Seja o somatório apenas das transações de PIX lidas do OFX que encontraram match com alguma OS na mesma data.
2. **Faturamento Atual:** Passe a ser a soma do valor que entrou na **Maquininha** (`cartao_entrou`, lido da REDE) com o valor de **PIX Entrou no Banco** (calculado acima).

Isso garantirá que o painel mostre a receita financeira real e confirmada na conta, e que a diferença matemática bata perfeitamente contra os depósitos.

## Contratos de Dados
- Nenhuma alteração no Supabase. O ajuste é estritamente no frontend, na interpretação e correlação das transações `ofx` com `patio_os`.
- Mutações e RLS intocados.

## API / Interface
- O hook `useModulo1StoresData(date: string)` sofrerá alterações em sua função interna `queryFn`. A lógica de correlacionar OFX com OS (já existente em `useReconciliationViews`) será simplificada e embutida aqui para somar `pixOs` e redefinir `faturamento_atual`.

## Features Existentes Impactadas
- **Dashboard Lojas (Aba Saldo / Resumo):** `Modulo1SaldoPanel.tsx` (não terá o código alterado, mas os valores renderizados mudarão).
- **Lista de Lojas Principal:** O grid de cards das lojas em `conciliacao.index.tsx` mostrará valores drasticamente reduzidos e precisos de Faturamento e Diferença.

## Risco Principal
- Desempenho e duplicação de lógica: A lógica de match de PIX (OFX vs OS) hoje vive dentro de `useReconciliationViews`. Fazer esse match manual dentro de `useModulo1StoresData` pode duplicar regras. Precisaremos reimplementar o "Match PIX" simplificado dentro do map das lojas no `useModulo1StoresData`, varrendo os `txs` (tipo "in", contendo "PIX", "TED", etc no title) e cruzando com os `storeOs` de mesmo valor.
