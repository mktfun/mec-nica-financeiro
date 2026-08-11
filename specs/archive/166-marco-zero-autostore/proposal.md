# Proposal: Marco Zero Auto-Store Mapping (166)

## Problema
O parser atual do Marco Zero (`marcoZeroParser.ts`) estava iterando pelas planilhas (`workbook.SheetNames`) e assumindo que cada aba representava um "bloco" de dados global. No entanto, a planilha legada real (ex: `CONCILIAÇÃO 1008.xlsx`) consolida **todas as 10 lojas** dentro das mesmas abas ("SALDO" e "OS"), separando-as por linha (ex: Coluna A = Loja, Coluna B = Dinheiro MP). Isso faz com que o parser atual falhe em agrupar os saldos e as OSs para cada loja individualmente, exigindo um mapeamento manual irreal na interface `MarcoZeroWizard`.

## Solução Proposta
Refatorar a extração do Excel para ler os dados **linha a linha**, identificando a loja correspondente na primeira ou segunda coluna de cada linha. Os saldos e OSs serão agrupados em memória por `storeName`, gerando um `MarcoZeroExtraction` isolado para cada loja automaticamente. O `MarcoZeroWizard` será adaptado para cruzar o nome extraído com a lista de lojas do Supabase (case-insensitive), auto-selecionando o ID da loja correspondente.

## Contratos de Dados
- Nenhuma alteração nas tabelas Supabase.

## API / Interface
- **`marcoZeroParser.ts`**: Atualizado para agrupar por loja.
- **`MarcoZeroWizard.tsx`**: Modificado para aceitar o `storeName` mapeado automaticamente e reduzir cliques do usuário.

## Features Existentes Impactadas
- **Implantação de Saldo Inicial (Marco Zero Global)** (spec/global/features.md)

## Risco Principal
- **Probabilidade**: Alta (Nomes de lojas na planilha podem ter erros de digitação vs Banco).
- **Impacto**: Reversível (Operador pode corrigir no form).
- **Mitigação**: Manter os selects de "Vincular Loja" visíveis, permitindo que o usuário corrija manualmente caso o auto-match falhe para alguma filial.
