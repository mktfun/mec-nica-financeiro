# Design: Importação de Relatório Diário de Unidades

## 1. Arquitetura da UI (Stitch/React)
A interação ocorrerá majoritariamente no `ImportReportDialog.tsx`:
1. **Estado Inicial**: Seleção de Loja (Drowdown) + Campo de Arquivo.
2. **Estado Loading**: Barra de progresso circular simulando o processamento do relatório.
3. **Estado Confirmação**: Após o parsing, exibimos os valores encontrados e pedimos a validação humana antes do salvamento definitivo.

## 2. Arquitetura do Backend (Supabase MCP)
### Storage
Criar um novo Bucket no Supabase chamado `reports` para arquivar os anexos originais. Cada arquivo salvo deverá conter no metadado: `store_id` e `date`.

### Lógica de Extração (Parser)
Dependendo da complexidade do Doc, a leitura será feita de 2 formas possíveis:
1. **Padrão Fácil (CSV/TXT/Excel)**: O parsing pode ser feito direto no navegador usando `papaparse` ou lendo linha a linha em JavaScript.
2. **Padrão Difícil (Foto/PDF Impresso)**: Seremos obrigados a criar uma **Edge Function** no Supabase, que receberá o PDF/Imagem, consultará a API da OpenAI (Vision) e retornará um JSON estruturado com os valores.

## 3. Mapa de Dependências
- O envio do formulário no `ImportReportDialog` depende da função de upload (`supabase.storage.from('reports').upload()`).
- Após processamento, o salvamento da conciliação depende do uso direto da mutation existente `useSaveDailyCash(storeId, valor, yesterday)`.
- O Dashboard principal, através do React Query, escutará a alteração e recalculará automaticamente a métrica do gráfico de divergência e "Entradas".
