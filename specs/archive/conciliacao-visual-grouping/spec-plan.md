# Spec Plan: Pareamento Agrupado de ConciliaçÁo, Modal de Detalhes da OS e Redesign de Cards (conciliacao-visual-grouping)

## Tasks

- [x] [FRONTEND] Atualizar `src/hooks/useConciliacao.ts`:
  - [x] Remover restriçÁo rígida de `entry_date` na busca de `patio_os` para encontrar OSs da loja independentemente da data de abertura.
  - [x] Agrupar transações da Rede por depósito OFX adquirente correspondente na Aba 2 (`redeVsOfx`).
- [x] [FRONTEND] Criar componente `src/components/conciliacao/OsDetailModal.tsx`:
  - [x] Modal com detalhes completos da OS, valor total, formas de pagamento fracionadas e status de pareamento.
- [x] [FRONTEND] Refatorar `src/components/conciliacao/OsVsRedeTable.tsx`:
  - [x] Adicionar evento de clique na OS para abrir o `OsDetailModal`.
  - [x] Corrigir exibiçÁo do faturamento real da OS e zerar deltas falsos.
- [x] [FRONTEND] Refatorar `src/components/conciliacao/RedeVsOfxTable.tsx`:
  - [x] Exibir cards agrupados por Depósito OFX com suas vendas filhas da maquininha somadas.
  - [x] Redesenhar os 3 cards do topo para o padrÁo Dark UI (`Zinc-950`).
- [x] [FRONTEND] Refatorar `src/components/conciliacao/PixVsOfxTable.tsx`:
  - [x] Agrupar entradas de PIX do OFX diretamente com as OSs de PIX correspondentes.
- [x] [TEST] Verificar compilaçÁo limpa com `npm run build`.
