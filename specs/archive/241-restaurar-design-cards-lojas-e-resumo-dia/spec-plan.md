# Spec Plan: Restaurar Design Original dos Cards de Lojas e Painel de Resumo do Dia (Spec 241)

## Tasks

### FRONTEND — ResumoDiaPanel

- [x] [FRONTEND] Restaurar o layout visual de `ResumoDiaPanel.tsx` baseado no commit `0a092ce`:
  - Tokens de design system: `bg-[var(--bg-surface)]`, `bg-[var(--bg-surface-elevated)]`, `border-[var(--border-subtle)]`, `text-[var(--text-primary)]`, `text-[var(--color-primary)]`, etc.
  - Header com gradiente clássico `bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-surface-elevated)]`.
  - Seletor de data com input embutido nativo.
  - Grid dos 5 Pilares `grid grid-cols-2 md:grid-cols-5 gap-4 mb-6`.
  - Sub-linhas do Pilar 1 (OFX e + Maq) e Pilar 5 (Juros, Devoluções se > 0, e OFX Out).
  - Painel de 2 colunas: Consolidação do Dia (2 cols) + Balanço do Fechamento & Diferença (1 col).
  - Preservar cálculo de `devolucoesRedeValor` e `subtotalContasCalculado` da Spec 240.

### FRONTEND — Cards das Lojas (conciliacao.index.tsx)

- [x] [FRONTEND] Restaurar o layout dos cards das filiais em `src/routes/conciliacao.index.tsx` baseado no commit `0a092ce`:
  - Container horizontal flexível `flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6`.
  - Lado esquerdo: Barra lateral de conformidade `w-2 h-14 rounded-full`, Nome da loja, Badges `ENTROU` / `NÃO ENTROU (+ R$ ...)`, ID da loja.
  - Lado direito: Envelope escuro contínuo `bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1` com grid de 6 colunas (`Saldo Bancos + Cartões`, `Maquininha`, `PIX`, `Na Loja OS`, `Previsto`, `Diferença`).
  - Botão Raio-X flutuante (`absolute top-3 right-3`) visível no hover.

### TESTES / VERIFICAÇÃO

- [x] [TEST] Verificar renderização de `ResumoDiaPanel.tsx` sem quebras de layout ou estilização dissonante.
- [x] [TEST] Verificar renderização dos cards das lojas em `conciliacao.index.tsx` (layout horizontal com barra lateral de conformidade e as 6 métricas alinhadas).
- [x] [TEST] Verificar que as devoluções da Rede continuam somando em Contas do Dia e no subtotal.
- [x] [TEST] Executar `npm run build` e confirmar 0 erros.
