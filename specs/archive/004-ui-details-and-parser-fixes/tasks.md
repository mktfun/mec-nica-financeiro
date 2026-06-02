# Tasks (004-ui-details-and-parser-fixes)

- [x] **1. Correção do Parser (Fechamento Diário)**
  - [x] No `ImportReportDialog.tsx`, obter a data do dia (`getDefaultDate()`).
  - [x] Somar `totalOs` e `totalPaid` *apenas* se a OS foi finalizada/paga no próprio dia, ignorando OSs finalizadas em dias anteriores que estejam no histórico do Excel.

- [x] **2. Modal de Detalhes no Pátio**
  - [x] No `patio.tsx`, adicionar estado `selectedOs` e utilizar o componente `Modal`.
  - [x] Criar o conteúdo do Modal para exibir todas as propriedades da Ordem de Serviço selecionada, reutilizando o visual do `renderPaymentMethods`.

- [x] **3. Correção de Encoding no Banco**
  - [x] Criar um script node (ou executar `supabase.rpc`/query) para fazer `UPDATE stores SET name = 'Rei do Módulo' WHERE name LIKE '%Mdulo%'`.

- [x] **4. Build e Explicação**
  - [x] Rodar o build e commit.
  - [x] Informar ao usuário sobre a lógica dos Recebíveis (que são transações de crédito/boleto futuras de OSs já finalizadas, não relacionando com o "Em Aberto" do Pátio).
