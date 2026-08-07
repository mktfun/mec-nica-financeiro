# Proposal: Saldo Anterior Nativo do OFX (089)

## Problema

Atualmente, o "Saldo Anterior" (usado na aba de ConciliaçÁo e no Dashboard) é calculado olhando para o banco de dados do dia anterior (seja puxando o `bank_total` do dia anterior ou usando o `caixa_atual` do fechamento prévio).

**Riscos dessa abordagem atual:**
- Se o usuário nÁo importou o OFX do dia anterior (ou houve um erro/duplicaçÁo nÁo corrigido naquele dia), o Saldo Anterior do dia atual ficará incorreto.
- O fechamento da conciliaçÁo depende do histórico perfeito. Um dia errado quebra a matemática do dia seguinte em cascata.

## VisÁo da SoluçÁo

Para "bater as contas certinho" independentemente do que aconteceu no passado, devemos extrair a verdade absoluta diretamente da fonte: o extrato do banco.

Todo arquivo OFX brasileiro contém uma transaçÁo indicando o `<SALDO ANTERIOR>` do dia (ou o saldo inicial daquele período de exportaçÁo). O nosso parser (`ofxParser.ts`) já consegue capturar essa informaçÁo, mas ela atualmente é descartada na hora de salvar no Supabase.

A proposta é:
1. **Capturar e salvar:** Armazenar o `bank_previous_balance` de cada loja na tabela `reconciliations` no momento da importaçÁo do OFX.
2. **Atualizar a UI (ConciliaçÁo e Dashboard):** Mudar a origem de dados do Saldo Anterior/Caixa Anterior. Em vez de somar históricos complexos (`previousSnapshot?.caixa_atual`), passaremos a ler diretamente a soma do `bank_previous_balance` do dia atual — que é injetado confiavelmente pelo extrato.

## Benefícios
- **Isolamento de dias:** O dia de hoje fecha matematicamente mesmo se o dia de ontem estiver vazio no sistema.
- **Robustez:** Acaba com o efeito cascata de erros (onde um saldo inicial errado afeta o Saldo Final e a Diferença).
- **Prova contra alucinaçÁo:** Confiança 100% bancária (já que vem do documento fonte do banco).

## Próximos Passos
Se a visÁo estiver correta, daremos andamento na especificaçÁo técnica (Design e Tasks). Se aprovar a ideia, digite `/vibe-apply 089` para eu implementar.
