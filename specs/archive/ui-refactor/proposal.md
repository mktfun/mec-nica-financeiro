# Proposal: Refatoração UI Conciliação (ui-refactor)

## Problema
A interface atual de detalhes de conciliação agrupa os dados pela perspectiva do Extrato Bancário (OFX) e utiliza agrupamentos complexos em camadas (matching 1:1, agrupamentos temporais, etc), o que dificulta a leitura do usuário, especialmente nas abas de Maquininha e PIX. O usuário deseja que a visão primária seja um "Extrato" simples e direto das transações processadas nas Maquininhas e nos PIX gerados pelas OSs, indicando em cada linha se o valor "Entrou" ou "Não Entrou" no banco.

Além disso, a tela de Alertas de Exceções está poluindo a interface e foi solicitado que seja removida.

## Solução Proposta
- **Aba Maquininha**: Refatorar `RedeVsOfxTable.tsx` para listar todas as transações da maquininha (`rede`) em formato de tabela (tipo extrato), exibindo Valor Bruto, OS Vinculada, Valor Líquido, Taxa (% e R$), e uma coluna Status ("Entrou" ou "Não entrou" - de acordo com o cruzamento com o OFX).
- **Aba PIX**: Refatorar `PixVsOfxTable.tsx` utilizando a mesma lógica, listando os PIXs das OSs (inclusive de OSs em aberto) em formato de extrato, sua OS vinculada e a coluna Status ("Entrou" ou "Não entrou" no OFX).
- **Aba Banco (Sem Origem)**: Garantir que a tabela `OfxSemMatchTable.tsx` continue exibindo EXCLUSIVAMENTE lançamentos bancários que não são de maquininha e não tiveram match (Entradas avulsas).
- **Remoção de Alertas**: Remover o componente `ConciliacaoAlertsSection.tsx` e a respectiva aba no `conciliacao.$lojaId.tsx`.

## Contratos de Dados
- Não serão criadas novas tabelas no Supabase.
- A mutação no comportamento visual dependerá da adaptação do objeto de retorno do hook `useReconciliationViews` e da estruturação do HTML das tabelas.

## API / Interface
- **Componentes Afetados**:
  - `src/components/conciliacao/RedeVsOfxTable.tsx`
  - `src/components/conciliacao/PixVsOfxTable.tsx`
  - `src/routes/conciliacao.$lojaId.tsx` (Remover aba de Alertas)
- **Hooks Afetados**:
  - `src/hooks/useConciliacao.ts` (Ajustar a estruturação de `osVsRede` e `pixVsOfx` para injetar os status individuais de "Entrou/Não entrou", possivelmente simplificando o cruzamento).

## Features Existentes Impactadas
- O cruzamento de dados de Conciliação em Camadas existente será substituído nas interfaces (embora possa continuar ocorrendo nos cálculos de backend para inferir o binário Entrou/Não Entrou).

## Risco Principal
- Garantir que todas as informações (OS vinculada, taxas da maquininha e valor bruto/líquido) estejam disponíveis facilmente ao iterar a lista crua de transações no front-end, já que atualmente a lógica agrupa em blocos pelo valor OFX. O hook `useConciliacao` precisa garantir que as transações de `rede` que não caíram no `ofx` ainda tragam o match de OS caso aplicável.
