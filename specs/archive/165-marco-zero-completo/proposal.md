# Proposal: Marco Zero Global & Auditoria do Passivo (165)

## Problema
O parser atual da planilha "Marco Zero" é extremamente restrito. Ele busca por abas fixas ('SALDO', 'OS') e associa os dados a uma única loja selecionada no dropdown. No entanto, o usuário relatou que a planilha legada funciona como um verdadeiro "banco de dados" estruturado: ela contém a conciliação completa de múltiplas lojas com várias páginas, incluindo cálculos já efetuados na página principal.
Além disso, não existe um fluxo lógico para o "dia seguinte" da conciliação contínua (ex: amanhã), que garanta que as OSs antigas mapeadas não fiquem paradas no estoque passivo. É preciso forçar a atualização manual delas antes de seguir com a conciliação do mês atual.

## Solução Proposta
1. **Extração Global e Cega (Multiloja):** Refatorar o `marcoZeroParser.ts` para que ele não dependa do usuário selecionar uma loja. Ele deve ler todas as abas, interpretar a página principal da conciliação de cada loja e extrair automaticamente os saldos e o Passivo (OSs pendentes), entregando um dicionário completo de todas as lojas processadas no Excel.
2. **Atualização em Lote (MarcoZeroWizard):** A interface do Wizard vai mostrar um resumo de todas as lojas lidas do arquivo de uma só vez, e o botão de Implantação gravará no Supabase (em `estoque_os_pendente` e `daily_snapshots`) os saldos de todas elas simultaneamente.
3. **Fluxo Contínuo - Auditoria de Passivo (Next Day):** O `CentralImportWizard` ganhará um novo "Passo 2.5: Auditoria do Passivo". Nele, o sistema forçará a exibição das OSs que estão como `PENDENTE` em `estoque_os_pendente` (do passivo passado) e exigirá que o usuário atualize o status delas manualmente (Paga, Cancelada, etc) ANTES de prosseguir para o Match Manual de novas OFX/Pix.

## Contratos de Dados
- **Tabela `estoque_os_pendente`:** Inserts em massa de todas as lojas contidas no Excel.
- **Tabela `daily_snapshots` ou `reconciliations`:** Os saldos das lojas serão atualizados injetando o "Caixa Atual" (extraído da planilha) como valor de largada para o mês/dia vigente.

## API / Interface
- `MarcoZeroWizard.tsx`: Exclusão da seleção de loja; interface para visualização do lote completo.
- `CentralImportWizard.tsx`: Nova UI de Auditoria listando as OSs velhas pendentes e forçando a ação.
- `marcoZeroParser.ts`: Nova lógica de iteração multiloja, sem hardcode de nomes fixos em uma única página de saldo.

## Features Existentes Impactadas
- Fluxo de importação na Central (novo passo adicionado).
- Painel de resumo financeiro "Na Loja" (depende diretamente de como os saldos e OSs vão entrar no banco via script global).

## Risco Principal
- O parser quebrar devido à variabilidade gigante nos nomes das abas ou na localização das células dentro do Excel. Precisamos definir uma âncora visual forte nas abas (como "CONCILIAÇÃO 1008" ou o layout exato das tabelas).
- (Dúvida pendente: Como diferenciar qual aba pertence a qual loja na leitura do parser?)
