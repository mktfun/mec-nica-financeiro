# Proposal: Padronização da Conciliação Diária e Fechamento por Filial no Padrão Canônico do Pátio (306)

## Problema
Apesar da introdução do Design System na Spec 305, as telas mais críticas da operação financeira diária continuam fragmentadas, espremidas e com visual discrepante:
1. **Layouts Espremidos:** As páginas de Conciliação mantêm travas duras de `max-w-5xl mx-auto` (1024px) e `max-w-6xl mx-auto`, comprimindo números contábeis em resoluções de desktop (1080p e 1440p).
2. **Cards Anômalos e Micro-Tipografia ("bg-black/25"):** O painel de resumo de cada loja e o cabeçalho da filial utilizam blocos escuros artificiais com 6 colunas amontoadas em texto minúsculo (`text-[9px]` e `text-xs`), que não existem em nenhum outro lugar do sistema.
3. **Disparidade Crassa com a Referência Canônica (`src/routes/patio.tsx`):** A tela de Pátio (e sua gêmea de Recebíveis) possui a identidade canônica ideal do projeto:
   - Header limpo com contadores em `<Badge variant="success">`.
   - **4 Summary Cards Canônicos (`border-l-4`)** com título uppercase tracking-wider e valores monumentais em `font-mono text-2xl font-bold`.
   - Abas com `border-b-2` plano e discreto.
   - Lista / Tabela contida em `<Card className="p-0 overflow-hidden mt-4">` com `divide-y divide-[var(--border-subtle)]`, avatares circulares coloridos por status e números financeiros milimetricamente alinhados à direita com `tabular-nums`.
4. **Tabelas Internas Inconsistentes:** A visão de vendas em cartão (`StoreCartaoMaquininhaView.tsx`) utiliza fundo `bg-zinc-950`, badges isolados com classes soltas (ex: `LIQUIDADO NO BANCO` em pill outline customizada) e bordas `border-l-2` em cards de subtotal que fogem dos tokens do sistema.

## Solução Proposta
Refatorar integralmente a camada de apresentação das telas de Conciliação para espelhar **1:1** o padrão de excelência de `src/routes/patio.tsx` e `src/routes/recebiveis.tsx`:
1. **Adotar `PageContainer variant="finance"`:**
   - Desbloquear a viewport para `max-w-[1600px] 2xl:max-w-[1800px]` em `conciliacao.index.tsx` e `conciliacao.$lojaId.tsx`.
2. **Substituir o Bloco de 6 Métricas pelos 4 Summary Cards Canônicos (`border-l-4`):**
   - Na listagem geral (`conciliacao.index.tsx`):
     - Card 1 (`border-l-[var(--color-primary)]`): Total Faturamento Previsto
     - Card 2 (`border-l-blue-500`): Total Entradas no Banco (OFX)
     - Card 3 (`border-l-amber-500`): Total A Compensar / Pendente
     - Card 4 (`border-l-rose-500` ou `border-l-emerald-500`): Divergência Global / Status
   - Na página da filial (`conciliacao.$lojaId.tsx`):
     - Card 1 (`border-l-[var(--color-primary)]`): Faturamento Previsto da Loja
     - Card 2 (`border-l-blue-500`): Saldo Bancário OFX
     - Card 3 (`border-l-amber-500`): Na Loja OS (Pátio Aberto)
     - Card 4 (`border-l-rose-500` ou `border-l-emerald-500`): Diferença da Loja / Status
3. **Lista de Fechamento por Filial no Formato Canônico Pátio (`conciliacao.index.tsx`):**
   - Substituir os cards pretos soltos por um container mestre `<Card className="p-0 overflow-hidden mt-4">` com `<div className="divide-y divide-[var(--border-subtle)]">`.
   - Cada linha de filial conterá:
     - **Esquerda:** Avatar circular da filial com iniciais (`w-10 h-10 rounded-full flex items-center justify-center font-bold`) colorido com semáforo estrito (verde se `diff === 0`, vermelho se divergente) + Nome da Loja em destaque + Badge de status semântico + ID.
     - **Direita:** Grid financeiro perfeitamente alinhado com `font-mono tabular-nums text-right`: Saldo Bancos, Maquininha, PIX, Na Loja OS, Previsto e Diferença.
     - Botão de ação "Raio-X" visível e elegante.
4. **Padronização de `StoreCartaoMaquininhaView.tsx`:**
   - Converter os 4 cards superiores para o padrão `border-l-4` canônico (sem bordas arbitrárias `border-l-2`).
   - Migrar a tabela de Vendas em Cartão para as primitivas de tabela (`<TableContainer>`, `<TableHeader>`, `<TableRow>`, `<TableCell>`) com alinhamento rigoroso à direita para valores monetários e semáforo cromático estrito nos badges de liquidação (`Liquidado` em verde, `A Compensar` em âmbar).

## Contratos de Dados
- Nenhuma alteração de schema, tabela ou RPC Supabase.
- Os hooks existentes (`useDailyReconciliationSummary`, `useStores`, `useTransactionsPorDataELoja`, `useReconciliationViews`, `usePosTripleReconciliation`) continuam sendo consumidos sem qualquer mudança em seus contratos.
- Todas as operações contábeis, cálculos e mutações permanecem 100% idênticas e preservadas.

## API / Interface
- `PageContainer`: Utilizado como wrapper raiz em `conciliacao.index.tsx` e `conciliacao.$lojaId.tsx` com `variant="finance"`.
- `Badge`: Uso estrito das variantes semânticas:
  - `variant="success"`: Apenas para `diff === 0` e transações 100% liquidadas no banco.
  - `variant="danger"`: Apenas para diferenças contábeis reais e anomalias.
  - `variant="warning"`: Transações pendentes ou valores a compensar.
  - `variant="neutral"`: Identificadores cadastrais e metadados.
- `AmountCell`: Renderização compulsória de todas as células de valor monetário nas tabelas e cards.

## Features Existentes Impactadas
- `src/routes/conciliacao.index.tsx`: Redesenho completo da lista de filiais e cabeçalho.
- `src/routes/conciliacao.$lojaId.tsx`: Redesenho do cabeçalho da filial e métricas de topo.
- `src/components/conciliacao/StoreCartaoMaquininhaView.tsx`: Padronização dos 4 cards de resumo e da tabela de vendas em cartão.

## Risco Principal
- **Risco:** Quebrar navegação para `/conciliacao/$lojaId` ou impedir a abertura dos modais (`BreakdownModal` e `ExtratosImportacaoModal`) ao alterar a estrutura de containers.
- **Mitigação:** Preservar estritamente os nós de Link do TanStack Router, os estados React dos modais (`isExtratosOpen`, `breakdownStore`) e garantir que cliques em botões de ação utilizem `e.stopPropagation()` quando aninhados.\n