# Proposal: Fix Definitivo da ImportaçÁo de Planilha (005)

## Contexto
O atual script de importaçÁo tenta ler a planilha usando mapeamentos fixos gerados pela leitura padrÁo da biblioteca `xlsx` (`__EMPTY_1`, `__EMPTY_2`, etc). Como a planilha de exportaçÁo do cliente possui cabeçalhos complexos, textos mesclados ou colunas que mudam de posiçÁo/nome dependendo do relatório exportado, a extraçÁo de dados está falhando (hora lê lixo, hora nÁo acha a data certa, hora ignora dados válidos). O resultado atual extraiu apenas uma OS (R$ 8.550,00) indicando que as outras falharam nos validadores.

## Objetivo
Implementar um **Parser Dinâmico** que escaneia a planilha linha por linha em formato bruto (array de arrays) até encontrar a "Linha de Cabeçalho" (onde as palavras "OS", "Data Fim", "Liquidado" estÁo), e a partir daí, mapear exatamente o índice de cada coluna. Isso torna a importaçÁo imune a mudanças de ordem de coluna e cabeçalhos sujos no topo do arquivo.

## Requisitos e User Stories
- **Mapeamento Dinâmico:** O sistema deve encontrar as colunas independentemente de estarem na posiçÁo A, B, C ou Z.
- **DetecçÁo Robusta de Datas:** Identificar corretamente se a data fornecida é um número serial do Excel ou uma string de texto, preservando a `targetDate`.
- **PrevençÁo de Falsos Positivos:** Ignorar todas as linhas antes do cabeçalho oficial e ignorar linhas de somatório no rodapé.

## O que já existe
- A biblioteca `xlsx` já está no projeto e em uso.
- O arquivo `ImportReportDialog.tsx` possui todo o fluxo de React (upload, botÁo de confirmar, interface).
- O banco de dados e os hooks de gravaçÁo já estÁo prontos (via `useImportProcessor`).

## O que será criado/modificado
- Será refeita **apenas a funçÁo `handleFileUpload`** no `ImportReportDialog.tsx`.
- Usaremos `xlsx.utils.sheet_to_json(ws, { header: 1 })` que retorna um grid exato bidimensional (matriz) de linhas x colunas, facilitando a depuraçÁo e o mapeamento.

## Critérios de Aceite
1. Subir a planilha com a "Data de Fechamento" para 28/05/2026 deverá retornar exatamente a soma real das OSs pagas naquele dia.
2. NÁo pode falhar silenciosamente omitindo OSs que possuam data válida na coluna correta.
