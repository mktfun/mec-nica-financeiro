# Spec Plan: RefatoraçÁo UI ConciliaçÁo (ui-refactor)

## Tasks

- [ ] [FRONTEND] Ajustar hook `useConciliacao.ts` na linha em que calcula a taxa da maquininha (`taxaTx = taxaTransactions...`) para garantir que os objetos passados para a View contenham `taxa_percent` e `taxa_brl` extraídos, facilitando o render das colunas de Taxas no front-end.
- [ ] [FRONTEND] Refatorar `src/components/conciliacao/RedeVsOfxTable.tsx` para listar todas as vendas das maquininhas (`rede` e `unassignedRedeTxs`) numa tabela em formato de "Extrato", ocultando os cards de camadas e o design atual de match 1:N.
- [ ] [FRONTEND] Incluir na `RedeVsOfxTable.tsx` a coluna binária de `Status ("Entrou" ou "NÁo Entrou")`. Uma transaçÁo entrou se ela estiver listada dentro dos `childRedeTxs` dos `depositGroups`.
- [ ] [FRONTEND] Refatorar `src/components/conciliacao/PixVsOfxTable.tsx` utilizando a mesma estrutura HTML da tabela acima, mas agora iterando apenas sobre `pixVsOfx.osPix`, listando cada PIX gerado pelas OSs.
- [ ] [FRONTEND] Incluir na `PixVsOfxTable.tsx` a coluna de Status ("Entrou" ou "NÁo Entrou"), verificando o match através da lista de `pixGroups`.
- [ ] [FRONTEND] Alterar `src/routes/conciliacao.$lojaId.tsx` para remover completamente o import e uso de `ConciliacaoAlertsSection` e da respectiva aba `alerts`.
- [ ] [FRONTEND] Modificar `src/components/conciliacao/OfxSemMatchTable.tsx` para assegurar que só renderize as transações de `ofxSemMatch` (que já excluem as adquirentes e as combinadas) sem mençÁo cruzada, mantendo seu propósito original (Banco Sem Origem).
- [ ] [TEST] Verificar no frontend se a renderizaçÁo foi aplicada e nenhuma das views antigas quebrou a conciliaçÁo.
