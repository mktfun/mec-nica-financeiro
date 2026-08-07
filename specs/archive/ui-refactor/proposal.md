# Proposal: RefatoraçÁo UI ConciliaçÁo (ui-refactor)

## Problema
A interface atual de detalhes de conciliaçÁo agrupa os dados pela perspectiva do Extrato Bancário (OFX) e utiliza agrupamentos complexos em camadas (matching 1:1, agrupamentos temporais, etc), o que dificulta a leitura do usuário, especialmente nas abas de Maquininha e PIX. O usuário deseja que a visÁo primária seja um "Extrato" simples e direto das transações processadas nas Maquininhas e nos PIX gerados pelas OSs, indicando em cada linha se o valor "Entrou" ou "NÁo Entrou" no banco.

Além disso, a tela de Alertas de Exceções está poluindo a interface e foi solicitado que seja removida.

## SoluçÁo Proposta
- **Aba Maquininha**: Refatorar `RedeVsOfxTable.tsx` para listar todas as transações da maquininha (`rede`) em formato de tabela (tipo extrato), exibindo Valor Bruto, OS Vinculada, Valor Líquido, Taxa (% e R$), e uma coluna Status ("Entrou" ou "NÁo entrou" - de acordo com o cruzamento com o OFX).
- **Aba PIX**: Refatorar `PixVsOfxTable.tsx` utilizando a mesma lógica, listando os PIXs das OSs (inclusive de OSs em aberto) em formato de extrato, sua OS vinculada e a coluna Status ("Entrou" ou "NÁo entrou" no OFX).
- **Aba Banco (Sem Origem)**: Garantir que a tabela `OfxSemMatchTable.tsx` continue exibindo EXCLUSIVAMENTE lançamentos bancários que nÁo sÁo de maquininha e nÁo tiveram match (Entradas avulsas).
- **RemoçÁo de Alertas**: Remover o componente `ConciliacaoAlertsSection.tsx` e a respectiva aba no `conciliacao.$lojaId.tsx`.

## Contratos de Dados
- NÁo serÁo criadas novas tabelas no Supabase.
- A mutaçÁo no comportamento visual dependerá da adaptaçÁo do objeto de retorno do hook `useReconciliationViews` e da estruturaçÁo do HTML das tabelas.

## API / Interface
- **Componentes Afetados**:
  - `src/components/conciliacao/RedeVsOfxTable.tsx`
  - `src/components/conciliacao/PixVsOfxTable.tsx`
  - `src/routes/conciliacao.$lojaId.tsx` (Remover aba de Alertas)
- **Hooks Afetados**:
  - `src/hooks/useConciliacao.ts` (Ajustar a estruturaçÁo de `osVsRede` e `pixVsOfx` para injetar os status individuais de "Entrou/NÁo entrou", possivelmente simplificando o cruzamento).

## Features Existentes Impactadas
- O cruzamento de dados de ConciliaçÁo em Camadas existente será substituído nas interfaces (embora possa continuar ocorrendo nos cálculos de backend para inferir o binário Entrou/NÁo Entrou).

## Risco Principal
- Garantir que todas as informações (OS vinculada, taxas da maquininha e valor bruto/líquido) estejam disponíveis facilmente ao iterar a lista crua de transações no front-end, já que atualmente a lógica agrupa em blocos pelo valor OFX. O hook `useConciliacao` precisa garantir que as transações de `rede` que nÁo caíram no `ofx` ainda tragam o match de OS caso aplicável.
