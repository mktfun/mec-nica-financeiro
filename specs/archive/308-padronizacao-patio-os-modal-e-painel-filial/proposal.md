# Proposal: Padronização do Modal de OSs do Pátio e Painel de 6 Métricas da Filial (308)

## Problema
1. O modal **Ordens de Serviço no Pátio (Na Loja OS)** (`src/components/conciliacao/PatioOsDetailModal.tsx`), acionado a partir do card "NA LOJA OS" do Hero Panel, está totalmente fora dos padrões visuais do Design System: cards com estilos ad-hoc (`bg-zinc-900/80 border-amber-500/30`), tabela em `bg-zinc-950/60` com bordas e badges customizados, botões de ação desiguais e inputs desalinhados.
2. Ao abrir a página de qualquer filial (`/conciliacao/$lojaId`), o operador perde a visualização do **painel executivo das 6 métricas** idêntico ao que ele estava conferindo no card da filial na página inicial (SALDO TOTAL, Maquininha, PIX, Na Loja OS, Previsto e Diferença). Isso dificulta a auditoria rápida de divergências entre o total da loja e o detalhamento por aba.
3. As abas de navegação da filial possuem um fundo esverdeado (`bg-emerald-500/5`) que não existe no restante do sistema (como na tela de referência `patio.tsx`), destoando da tipografia e do padrão de abas limpas com borda inferior ativa em esmeralda.

## Solução Proposta
1. **Padronizar `PatioOsDetailModal.tsx` no Padrão Canônico:**
   - Converter os 4 cards de topo para os **4 Summary Cards Canônicos (`border-l-4`)**: Saldo Total no Pátio (Âmbar), Valor Total das OSs (Azul), Veículos no Pátio (Roxo) e Lojas com OS Aberta (Esmeralda), todos com `<AmountCell>` e tipografia padronizada.
   - Alinhar o input de busca e o select de filiais aos tokens do Design System.
   - Envelopar a tabela de OSs em `<Card className="p-0 overflow-hidden border-[var(--border-subtle)]">` com cabeçalho `bg-[var(--bg-surface-elevated)]`, badges de status nativos do Design System (`Badge variant="warning"` para Em Aberto, `Badge variant="brand"` para Pago Parcial) e valores com `<AmountCell>` em `font-mono tabular-nums`.
2. **Restaurar e Enriquecer o Painel das 6 Métricas na Filial (`/conciliacao/$lojaId`):**
   - Inserir no topo de cada filial o painel executivo com as 6 métricas exatas e coerentes com a home:
     `[SALDO TOTAL | Maquininha | PIX | Na Loja OS | Previsto | Diferença]`
   - Garantir coerência contábil rigorosa entre o resumo da loja e os dados operacionais das abas.
3. **Padronizar as Abas da Filial 1:1 com `patio.tsx`:**
   - Extinguir o fundo `bg-emerald-500/5`.
   - Utilizar abas limpas com `border-b border-white/10`, aba ativa com `border-b-2 border-emerald-500 text-white` e inativa com `border-transparent text-[var(--text-tertiary)] hover:text-white`.

## Contratos de Dados
- Nenhuma mutação em schema de banco de dados é necessária. Utiliza as tabelas existentes `patio_os`, `stores`, `daily_reconciliation_summary` e RPCs de conciliação.

## API / Interface
- `PatioOsDetailModal.tsx`: Props inalteradas (`isOpen`, `onClose`, `targetDate`).
- `src/routes/conciliacao.$lojaId.tsx`: Exibição do painel executivo das 6 métricas e abas limpas.

## Features Existentes Impactadas
- `src/components/conciliacao/PatioOsDetailModal.tsx`
- `src/routes/conciliacao.$lojaId.tsx`
- `src/components/conciliacao/StoreOrdensServicoView.tsx` (atualização dos cards para border-l-4)

## Risco Principal
- Quebra de edição inline de OSs no modal `PatioOsDetailModal`: mitigado preservando 100% da lógica dos handlers de mutação React Query (`handleStartEdit`, `handleSaveEdit`, `handleCancelEdit`).\n