# Proposal: Ajuste Fino de Cores Canônicas e Contagem Precisa de Recebíveis (Spec 284)

## Problema
1. **Cores Artificiais:** O botão `+ Novo Recebível`, o botão `Importar Planilha` e o badge do Header estavam com estilos laranjas/amarelos fortes (`bg-amber-500 text-black`, `border-amber-500/30`), destoando da identidade visual e do padrão canônico de `patio.tsx`.
2. **Contagem e Interpolação:** A animação do `AnimatedNumber` ou a trava por data no hook causava exibição de valores intermediários (ex: R$ 11.667,65 em vez de R$ 11.814,50) ou zerava ao iniciar em datas que não tivessem títulos cadastrados naquele dia específico.

## Solução Proposta
1. **Padronização Estrita de Cores com o Design System:**
   - Botão `+ Novo Recebível`: Botão padrão primário (`bg-[var(--color-primary)] text-white font-medium hover:brightness-110`).
   - Botão `Importar Planilha`: Botão padrão outline neutro (`variant="outline" border-white/10 text-white hover:bg-white/5`).
   - Badge no Header: `<Badge variant="success" className="uppercase tracking-wider">{pendentes.length} {pendentes.length === 1 ? 'título em aberto' : 'títulos em aberto'}</Badge>`.
   - Avatares de status: `bg-[var(--color-primary)]/10 text-[var(--color-primary)]` para Em Aberto, `bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]` para Vencido, `bg-[var(--color-success)]/10 text-[var(--color-success)]` para Liquidado.

2. **Cálculo e Exibição Instantânea dos Recebíveis:**
   - O hook `useRecebiveis` busca todos os títulos a receber ativos no banco e deriva o status temporal com base na data de hoje/competência.
   - Exibição direta dos valores nos 4 cards:
     - **Total a Receber:** R$ 11.814,50 (Pilar 3)
     - **Total Vencidos:** R$ 3.464,83
     - **A Vencer Hoje:** R$ 0,00
     - **Liquidados no Período:** R$ 0,00
   - Valores precisos e imediatos sem cortes de animação.

## Risco Principal
- Garantir que a remoção das classes de cor customizadas respeite 100% o tema escuro do `AppShell` e a tipografia Inter/Outfit.
