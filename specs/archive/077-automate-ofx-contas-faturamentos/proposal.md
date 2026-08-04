# Proposal: Automatizar Contas a Pagar e Outros Faturamentos via OFX (077)

## Problema
Atualmente, no momento da importação dos arquivos (`CentralImportWizard`), o sistema exige o preenchimento manual de 4 campos: "Outros Faturamentos (R$)", "Desc. Outros Faturamentos", "Contas a Pagar" e "Provisão". Como esses valores já estão inseridos de forma natural dentro do fluxo do extrato bancário (OFX) (incluindo o nome do fornecedor/cliente), a digitação manual é redundante, cansativa e propensa a erros, forçando os usuários a refazerem o que a conciliação automatizada já sabe.

## Solução Proposta
1. **Remover os Campos Manuais do Importador**: Retirar do `CentralImportWizard` os 4 campos citados. Manteremos apenas os inputs de "Dinheiro MP" e "A Receber (Boleto/Desc.)" que realmente ocorrem fora do extrato.
2. **Derivação Automática via OFX**: 
   - **Contas a Pagar**: Será preenchido automaticamente pela soma de todas as transações de saída (`type === 'out'`) provenientes do OFX.
   - **Outros Faturamentos**: Será a soma de todas as transações de entrada do OFX (`type === 'in'`) **subtraído** do valor que o sistema já identificou como correspondente às OSs (PIX casados). O que sobra é lucro "solto" no extrato sem vínculo operacional (ex: Venda de sucata).
   - **Provisão**: Como o usuário pediu a remoção, o valor global passará a ser fixado em `0`.

## Contratos de Dados
- Não há mudanças estruturais na tabela. `daily_snapshots` continuará recebendo o valor final matemático gerado no fechamento.
- Os campos que antes eram passados do snapshot para a matemática em `ResumoDiaPanel.tsx` agora serão injetados dinamicamente com base nas linhas `transactions` recuperadas do banco.

## API / Interface
- **`CentralImportWizard.tsx`**: Remoção visual do HTML e do `useState` para os 4 campos retirados.
- **`useConciliacao.ts`**: Nenhuma mudança necessária no hook base, pois o `useConciliacaoResumo` já devolve o `totalOfxIn` e `totalOfxOut`.
- **`ResumoDiaPanel.tsx`**: Na montagem da prop `GlobalConciliacaoInput`, ao invés de buscar do `currentSnapshot` preenchido manualmente, leremos a diferença entre o OFX Global (usando o `resumo`) e os matchings das lojas (usando `storesMod1`).

## Features Existentes Impactadas
- **Conciliação Global (Fluxo de Caixa e Diferença)**: O cálculo de Diferença será impactado caso existam PIX de OSs sendo computados duplamente. A conta garantirá que Faturamento da OS e Faturamento Extra não colidam.

## Risco Principal
Se houver uma "saída" no OFX que não deva ser considerada "Conta a Pagar" (exemplo: transferência entre contas ou estorno manual), ela inflará as Contas Pagas. No modelo manual, o operador ignoraria essa transferência. No modelo automático, tudo que sai do extrato é despesa. (Considerando o fluxo atual da oficina, o cliente sinalizou que quer a remoção para automatizar).
