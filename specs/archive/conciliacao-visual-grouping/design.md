# Design: Pareamento Agrupado de Conciliação, Modal de Detalhes da OS e Redesign de Cards (conciliacao-visual-grouping)

## Arquitetura de Agrupamento por Depósito (Aba 2 & Aba 3)

```
[Depósito Bancário OFX: RECEBIMENTO REDE MAST R$ 3.982,71]
       │
       ├─► [Venda Maquininha 1: R$ 3.652,33 (Crédito)]
       ├─► [Venda Maquininha 2: R$ 330,38 (Crédito)]
       │
       └─► Soma dos Filhos: R$ 3.982,71 == Depósito OFX (Status: 100% PAREADO)
```

## Novos Componentes e Modificações

### 1. `OsDetailModal.tsx` (`src/components/conciliacao/OsDetailModal.tsx`)
- Modal de detalhes completos da OS.
- Exibe:
  - Cabeçalho: Número da OS, Cliente, Data, Status.
  - Cards de resumo: Valor Total, Valor Pago, Saldo Devedor.
  - Tabela de Formas de Pagamento: Cartão Crédito/Débito, PIX, Dinheiro.
  - Indicador de Conciliação por forma de pagamento.

### 2. Agrupamento em `RedeVsOfxTable.tsx` (Aba 2)
- Reorganizado de 2 colunas separadas para **Cards Agrupados por Depósito OFX**.
- Cada card exibe o depósito do banco no topo e a lista sanfonada de vendas da máquina que formam o valor do depósito.

### 3. Agrupamento em `PixVsOfxTable.tsx` (Aba 3)
- Agrupamento das entradas de PIX do OFX com as OSs do Pátio com pagamento via PIX.

### 4. Ajustes em `useConciliacao.ts`
- Remoção da cláusula `.eq('entry_date', date)` na busca de `patio_os` para garantir que OSs com datas de cadastro em dias vizinhos sejam encontradas e exibam o faturamento correto em vez de `R$ 0,00`.

## Restrições de UI
- Paleta Dark UI: Zinc-950 (`bg-[#050711]`), cards `bg-[var(--bg-surface-elevated)]`, bordas `border-zinc-800`.
- Badges com contraste limpo: Emerald (`bg-emerald-500/10 text-emerald-400 border-emerald-500/30`), Sky (`bg-sky-500/10 text-sky-400 border-sky-500/30`), Amber (`bg-amber-500/10 text-amber-400 border-amber-500/30`).
