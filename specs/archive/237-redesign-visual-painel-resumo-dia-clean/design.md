# Design Técnico: Redesign Visual e Descompressão do ResumoDiaPanel (Spec 237)

## 1. Estrutura de Layout e Grid

### 1.1 Top Header
- **Seletor de Data:** `< 17/08/2026 >` com background `bg-zinc-900` e borda suave `border-zinc-800`.
- **KPIs de Controle:** Badges minimalistas de fechamento no canto direito:
  - `Apurado Sistema: R$ 106.649,73`
  - `Entradas OFX: R$ 106.649,73`

### 1.2 Grid dos 5 Pilares
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5`
- Cada card com:
  - Header: Ícone contextual suave + Título elegante em `text-xs uppercase font-semibold text-zinc-400` + `WhisperDot`.
  - Valor: `text-xl sm:text-2xl font-bold font-mono text-zinc-100`.
  - Footer: Linha de sub-totais com `flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1.5 border-t border-zinc-800/60 mt-2`.

### 1.3 Esteira de Consolidação & Balanço
- Layout em 3 colunas harmoniosas (`grid-cols-1 lg:grid-cols-3 gap-5`):
  - **Coluna 1 (Caixa):** `Caixa Atual` e `Fluxo de Caixa`.
  - **Coluna 2 (Operacional):** `Faturamento Atual` (com modal de composição) e `Valor Disp. Contas`.
  - **Coluna 3 (Balanço do Fechamento):**
    - `Total de Contas`: `R$ 86.481,49` (Juros + Contas Manuais).
    - `Diferença Final`: Valor em destaque (`text-3xl font-mono font-extrabold`).
    - Badge de Status: `Fechamento Conforme` (Verde) ou `Divergência` (Âmbar/Vermelho).
