# Proposal: UI Details & Parser Fixes (004)

## Contexto
O usuário relatou problemas de interface (falta de detalhamento ao clicar em itens no pátio), problemas de acentuaçÁo (encoding do nome da loja), e um erro grave na regra de negócio da importaçÁo: a soma das Entradas do Dia (saldo líquido/fechamento) puxou todo o histórico da planilha (ex: R$ 89.138,60) ao invés de apenas as entradas do dia corrente. Além disso, há confusÁo sobre a lógica de Recebíveis vs Carros no Pátio.

## Requisitos e User Stories
1. **Detalhes da OS no Pátio:** Como usuário, quero clicar em um carro na tabela do Pátio e abrir um Modal com os detalhes completos daquela Ordem de Serviço (placa, loja, valores, datas e métodos de pagamento).
2. **CorreçÁo de Fechamento Diário:** A soma "Total Faturado" e "Total Pago" extraída da planilha nÁo pode ser a soma de *todas* as linhas do arquivo (já que o arquivo pode conter o histórico do mês). Ela deve somar APENAS as OSs cuja data de fechamento ou pagamento coincida com o dia da importaçÁo.
3. **CorreçÁo de Encoding:** Corrigir os caracteres quebrados ("Rei do Mdulo") atualizando o nome no banco de dados e garantindo que inputs de texto nÁo quebrem.
4. **Alinhamento de Lógica (Pátio x Recebíveis):** Explicar/ajustar a diferença de "Valores a Receber". No pátio, os carros "Em Aberto" ou "Pago Parcial" significam que o cliente ainda *nÁo pagou a oficina*. Em "Recebíveis", os valores vêm de carros "Finalizados" onde o cliente pagou em CartÁo/Boleto e o dinheiro vai cair no futuro. NÁo devem bater mesmo.

## O que já existe e será reutilizado
- Componente `Modal.tsx` genérico.
- Hook `useImportProcessor.ts` e componente `ImportReportDialog.tsx`.
- Lojas estÁo cadastradas no banco (podem ser editadas pelo modal já existente na UI do usuário).

## O que precisa ser criado/modificado
- `OsDetailsModal.tsx` para ser usado na tela de Pátio.
- Atualizar a lógica do `.forEach()` no `ImportReportDialog.tsx` para considerar `targetDate`.
- Atualizar no banco o nome da loja via script (ou instruir o usuário a renomear na interface).
