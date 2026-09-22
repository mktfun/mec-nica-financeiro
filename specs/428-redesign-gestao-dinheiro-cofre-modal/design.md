# Design — Spec 428: Redesign e Alinhamento Visual do Modal de Gestão de Dinheiro em Cofre

## 1. Arquitetura Visual e Diagrama de Camadas

O layout segue o modelo de elevação por luminância (Dark UI Zinc-950) e harmonia geométrica:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Modal (size="2xl" -> max-w-6xl)                                                │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Header Nativo do Modal: "Gestão e Rastreabilidade do Dinheiro em Cofre"   ✕ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│ Content (p-6, space-y-5, sem margens negativas artificiais):                     │
│                                                                                 │
│ ┌─ Toolbar Superior & Status ─────────────────────────────────────────────────┐ │
│ │ [Ícone Banknote] Subtítulo descritivo sutil          [+ Registrar Saída]    │ │
│ │ Badges: Snapshot Histórico / Modo Edição (se ativo)                         │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ ┌─ Grid de 4 Cards de Métricas (bg-card border border-border/50 rounded-xl) ──┐ │
│ │ 1. Em Trânsito / No Cofre   │ 2. Depositado no Banco │ 3. Saídas Pagas  │...│ │
│ │    R$ 0,00                  │    R$ 48.757,00        │    R$ 0,00       │   │ │
│ │    Conta no Caixa Atual     │    Entrou no OFX       │    Abatido cofre │   │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ ┌─ Navegação por Abas Limpa (Tabs) ───────────────────────────────────────────┐ │
│ │ [Composição Fração a Fração (32)]     [Sugestões de Saídas (Contas sem OFX)]│ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ ┌─ Barra de Filtros Alinhada ─────────────────────────────────────────────────┐ │
│ │ [🔍 Busca por OS, cliente, placa]   [Select Todas as Lojas]  [Mostrando X]  │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ ┌─ Tabela Analítica Ampla (overflow-x-auto, max-h-[440px] overflow-y-auto) ───┐ │
│ │ Loja (130px) │ OS/Placa (110px) │ Descrição (flex) │ Data │ Valor │ Status │ │
│ │ Dom Pedro    │ OS #620          │ Rafael Bruno     │17/09 │R$ 500 │DEPOSIT │ │
│ │              │ ENA0J49          │                  │      │       │        │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Design System & Especificação de Tokens

### 2.1. Tokens de Superfície e Borda
- **Container do Modal:** `size="2xl"` (`max-w-6xl`), `bg-popover border border-border`.
- **Cards de Métricas:**
  - Base: `bg-card/70 border border-border/50 rounded-xl p-3.5 space-y-1`.
  - Em Trânsito (Destaque Ativo): Indicador com `text-amber-400` ou dot sutil, valor `font-sans tabular-nums font-bold text-lg sm:text-xl text-amber-300`.
  - Depositado (Conciliado): `text-emerald-400`, valor `font-sans tabular-nums font-bold text-lg sm:text-xl text-emerald-300`.
  - Saídas/Despesas: `text-muted-foreground`, valor `font-sans tabular-nums font-bold text-lg sm:text-xl text-foreground`.
  - Total Geral: `text-muted-foreground`, valor `font-sans tabular-nums font-bold text-lg sm:text-xl text-foreground`.

### 2.2. Botão de Ação Primária
- **Botão "+ Registrar Saída em Dinheiro":**
  - Estilo: `bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 text-xs font-medium h-8 px-3 rounded-lg flex items-center gap-1.5 transition-colors`.

### 2.3. Tabela Analítica e Quebra de Linha
- **Estrutura:**
  - Container externo: `border border-border/60 rounded-xl overflow-hidden bg-card/30`.
  - Scroll horizontal e vertical: `overflow-x-auto max-h-[440px] overflow-y-auto custom-scrollbar`.
  - Tabela: `w-full text-left text-xs min-w-[760px]`.
- **Cabeçalho:**
  - `bg-muted/40 text-muted-foreground text-[10px] uppercase font-semibold tracking-wider border-b border-border/60 sticky top-0 z-10 backdrop-blur-sm`.
- **Células:**
  - **Loja:** `py-3 px-3.5 font-medium text-foreground whitespace-nowrap min-w-[130px]`.
  - **OS / Placa:** `py-3 px-3.5 min-w-[110px] whitespace-nowrap`. Tag OS em `bg-muted text-foreground border border-border/60 text-[11px] font-semibold px-1.5 py-0.5 rounded`.
  - **Cliente / Descrição:** `py-3 px-3.5 max-w-[260px] truncate text-foreground`.
  - **Data:** `py-3 px-3.5 text-muted-foreground whitespace-nowrap min-w-[90px]`.
  - **Valor:** `py-3 px-3.5 text-right font-bold font-sans tabular-nums text-foreground whitespace-nowrap min-w-[100px]`.
  - **Status:** `py-3 px-3.5 text-center min-w-[100px] whitespace-nowrap`.
    - No Cofre: `Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px]"`.
    - Depositado: `Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px]"`.
    - Saída: `Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-300 text-[10px]"`.
  - **Ação:** `py-3 px-3.5 text-right whitespace-nowrap min-w-[120px]`.
    - Botões com `whitespace-nowrap h-7 px-2.5 text-[11px] font-medium` garantindo que "Voltar p/ Cofre" nunca quebre em múltiplas linhas.

---

## 3. Cenários de Uso & Critérios de Aceitação

### Cenário 1: Happy Path (Visualização e Alternância de Status)
- **Ação:** Usuário clica no botão "Dinheiro em Cofre" na tela de conciliação do dia 18/09/2026.
- **Resultado Esperado:** O modal abre amplo (`max-w-6xl`), sem barras comprimidas, exibindo os 4 cards com valores perfeitamente legíveis em `tabular-nums`. A tabela mostra as 32 frações com nomes de loja, placas e botões "Voltar p/ Cofre" em uma linha única e sem texto quebrado.

### Cenário 2: Edge Case (Lista Vazia ou Filtro Restritivo)
- **Ação:** Usuário busca por termo inexistente ou seleciona loja sem lançamentos.
- **Resultado Esperado:** O empty state é renderizado com `p-8 text-center text-muted-foreground border border-dashed border-border/60 rounded-xl`, mantendo a geometria intacta sem quebrar a janela.

---

## 4. Critérios de Aceitação Verificáveis

1. `size="2xl"` aplicado no `Modal` de `CashVaultCompositionModal.tsx`.
2. Zero margens negativas (`-mx-6 -mt-6`) poluindo o container do modal.
3. Botão "Voltar p/ Cofre" 100% horizontal (`whitespace-nowrap`), sem quebra de linha.
4. Nomes de lojas (ex: "Dom Pedro - DP") 100% horizontais (`whitespace-nowrap`), sem quebras indevidas.
5. Cores alinhadas ao `DESIGN.md` (tokens semânticos, Zinc-950/Zinc-900, zero bordas fluorescentes desconexas).
6. Terminal Gate: `npm run build` executa com exit code 0 sem erros.
