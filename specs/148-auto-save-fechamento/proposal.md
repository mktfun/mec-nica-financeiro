# Proposal: Auto Save Conciliação (148-auto-save-fechamento)

## Problema
Após a importação massiva (OFX, Maquininha, OS), o sistema falha ao auto-salvar o fechamento do dia. O `CentralImportWizard` tenta chamar a RPC `get_dashboard_metrics` para obter os totais e salvá-los, porém, devido à migração anterior, a RPC lê os dados da própria tabela `daily_snapshots`. Como o snapshot do dia ainda não existe (ou está desatualizado), a RPC retorna valores parciais ou zerados, inutilizando o auto-save.
O usuário, então, é forçado a acessar manualmente o painel da loja e clicar no botão "Salvar Fechamento", o que torna a automação ineficaz.

## Solução Proposta
1. Refatorar o bloco final do `CentralImportWizard.tsx` (etapa de auto-save) para **recalcular os totais** internamente a partir das estruturas de dados já importadas e mapeadas em memória (OFX processados, POS processados, OS computadas).
2. O wizard fará a inserção direta das linhas em `reconciliations` (para cada loja atualizando o `na_loja_os`) e em `daily_snapshots`, substituindo a necessidade de abrir o painel.
3. No componente `ResumoDiaPanel.tsx`, introduzir uma validação para detectar se o dia ativo já possui um snapshot salvo (algo que já existe implicitamente). Se existir, o botão "Salvar Fechamento" deve ser renomeado para "Editar Fechamento", abrindo caminho para futuras manipulações manuais solicitadas pelo usuário.

## Contratos de Dados
- Tabela `daily_snapshots`: Nenhuma alteração estrutural, apenas será populada corretamente pelo fluxo do Wizard em vez do fluxo manual.
- Tabela `reconciliations`: O campo `na_loja_os` (patio) será inserido em massa ao fim do wizard.

## API / Interface
- Componente `CentralImportWizard.tsx`: Modificação substancial na função de save. A lógica matemática do "Caixa Atual", "Faturamento", etc. será construída através de agregações dos arrays de resultado (`results.ofxResults`, `results.osFiles`, `txsToInsert`).
- Componente `ResumoDiaPanel.tsx`: Modificação visual na label e ícone do botão `handleSave`.

## Features Existentes Impactadas
- **Importação Centralizada (`CentralImportWizard`)**: Terá a sua função de auto-save totalmente reparada.
- **Fechamento Diário (`ResumoDiaPanel`)**: UI modificada e risco reduzido de cliques acidentais de salvamento sobre dias já fechados.

## Risco Principal
- **Divergência Matemática**: Se o algoritmo agregado no `CentralImportWizard` for diferente daquele utilizado no `ResumoDiaPanel` (que usa a função JS interna `calculateGlobalConciliacao`), os valores finais poderão não bater. Para mitigar, a lógica do wizard deverá preferencialmente replicar exatamente a agregação global.
