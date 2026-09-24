# 📐 Design Técnico — Spec 437: Padronização Visual da Tela de Conciliação & Eliminação da "Salada de Cores"

## 1. Mapeamento de Classes e Tokens Visuais

### 1.1. Matriz de Cores por Elemento em `ResumoDiaPanel.tsx`

| Seção / Elemento | Estado Atual | Estado Proposto (Spec 437) | Justificativa |
|---|---|---|---|
| **Top 4: Saldo Bancos** | `text-[var(--color-accent-light-blue)]` | `text-white font-mono` | Número normal patrimonial |
| **Top 4: Sub-chip Cofre** | `border-amber-500/30 text-amber-300` | `border-[var(--border-subtle)] text-white font-mono` | Evita amarelo chamativo em saldo informativo |
| **Top 4: Sub-chip A Compensar** | `border-emerald-500/30 text-emerald-300` | `border-[var(--border-subtle)] text-white font-mono` | Evita verde chamativo em saldo informativo |
| **Top 4: Sub-chip Cheque Esp.** | `bg-red-500/10 text-red-400` | `bg-rose-500/10 border-rose-500/20 text-rose-400 font-mono` | Passivo financeiro / saldo devedor |
| **Top 4: Dinheiro MP** | `text-[var(--color-accent-teal)]` | `text-white font-mono` | Número normal patrimonial |
| **Top 4: A Receber** | `text-[var(--color-primary)]` | `text-white font-mono` | Número normal patrimonial |
| **Top 4: Na Loja OS (Pátio)** | `text-[var(--color-accent-warning)]` | `text-white font-mono` | Número normal patrimonial |
| **Header: Entradas OFX** | `text-[var(--color-primary)]` | `text-white font-mono` | Valor nominal de fechamento |
| **Linha 1: Caixa Atual** | `text-[var(--text-primary)]` | `text-white font-mono` | Número normal patrimonial |
| **Linha 1: Caixa Anterior** | `text-[var(--text-secondary)]` | `text-white font-mono` | Número normal histórico |
| **Linha 1: Fluxo de Caixa** | Dinâmico Teal / Danger | $\ge 0$: `text-emerald-400 font-mono` <br> $< 0$: `text-rose-400 font-mono` | **Cálculo de variação** ($\Delta$) |
| **Linha 2: Faturamento Dia** | Hover verde / misto | `text-white font-mono` | Número normal de produção |
| **Linha 2: Valor Disp. Contas** | `text-[var(--color-primary-bright)]` | `text-white font-mono` | **Exceção explícita do usuário:** branco normal |
| **Linha 2: Contas (Manual)** | `text-[var(--color-accent-danger)]` | `text-white font-mono` | **Exceção explícita do usuário:** branco normal |
| **Linha 2: Subtotal a Cobrir** | `text-[var(--color-accent-warning)]` | `text-white font-mono` | Número normal de despesas |
| **Card Lateral: Diferença Final** | Emerald / Rose 400 | Tolerância $\pm 50$: `text-emerald-400 font-mono` <br> Fora: `text-rose-400 font-mono` | **Cálculo mestre de fechamento** |

---

### 1.2. Matriz de Cores por Elemento em `StoreCardModulo1.tsx`

| Seção / Elemento | Estado Atual | Estado Proposto (Spec 437) | Justificativa |
|---|---|---|---|
| **Saldo Banco (OFX)** | Positivo: `emerald-400` / Negativo: `rose-400` | Positivo: `text-white font-mono` <br> Negativo: `text-rose-400 font-mono` | Saldo positivo é número normal; saldo negativo é passivo |
| **Rede Total** | `text-cyan-400` | `text-white font-mono` | Número normal de vendas de cartão |
| **Saldo em Pátio** | `text-amber-400` | `text-white font-mono` | Número normal de OSs em pátio |
| **Linha Entradas: OFX Entradas** | `text-emerald-400` | `text-white font-mono` | Crédito bruto bancário (número normal) |
| **Linha Entradas: Conciliado** | `text-zinc-300` | `text-zinc-300 font-mono` | Número normal |
| **Linha Entradas: Dif. a Justificar** | Teal / Danger | $\le 0,05$: `text-emerald-400 font-mono` <br> $> 0,05$: `text-rose-400 font-mono` | **Cálculo de divergência de crédito** |
| **Linha Saídas: Saídas OFX** | `text-rose-400` | `text-white font-mono` | Débito bruto bancário (número normal) |
| **Linha Saídas: Contas/Boletos** | `text-zinc-300` | `text-zinc-300 font-mono` | Número normal |
| **Linha Saídas: Dif. a Justificar** | Teal / Danger | $\le 0,05$: `text-emerald-400 font-mono` <br> $> 0,05$: `text-rose-400 font-mono` | **Cálculo de divergência de débito** |

---

## 2. Padrões de Design System (Zinc-950)

1. **Tipografia Monospaçada Tabular:**
   - Todos os valores numéricos utilizam `font-mono tabular-nums tracking-tight` para garantir alinhamento perfeito de colunas e centavos.
2. **Eliminação de Gradientes e Tons Não Semânticos:**
   - Banido o uso de `text-cyan-*`, `text-teal-*`, `text-amber-*` e `text-indigo-*` para valores monetários informativos.
   - O contraste principal é `text-white` sobre superfícies `Zinc-900` (`bg-card`, `bg-surface-elevated`) com bordas `border-border/40` (`Zinc-800`).
3. **Cores Semânticas Restritas:**
   - **Verde Positivo:** Exclusivamente `text-emerald-400` / `bg-emerald-500/10` / `border-emerald-500/20`.
   - **Vermelho Negativo:** Exclusivamente `text-rose-400` / `bg-rose-500/10` / `border-rose-500/20`.

---

## 3. Cenários Obrigatórios

### 3.1. Happy Path: Fechamento em Dia Conforme com Diferença Zero
- **Cenário:** Dia 22/09/2026 com todas as lojas conciliadas.
- **Resultado Visual:**
  - Cards de topo 100% brancos e limpos, sem saturação azul ou roxa.
  - Caixa Atual, Caixa Anterior, Faturamento, Valor Disp. Contas e Contas Manual exibidos em branco cristalino `text-white`.
  - Fluxo de Caixa exibe verde se positivo ou vermelho se negativo com o sinal correspondente.
  - Card Diferença Final brilha em `emerald-400` discreto indicando aprovação contábil.
  - Nos cards das lojas, todas as colunas de extrato são brancas e apenas as Diferenças exibem verde com status conciliado.

### 3.2. Edge Case: Dia com Divergência Contábil e Loja com Cheque Especial
- **Cenário:** Dia 24/09/2026 onde Mauá possui saldo negativo de `-R$ 3.854,72` e a Diferença Final é `-R$ 31.897,22`.
- **Resultado Visual:**
  - Em Mauá, o Saldo Banco exibe `-R$ 3.854,72` em vermelho `text-rose-400` indicando cheque especial.
  - Os valores de OFX Entradas e Saídas continuam em branco puro, sem colorir de verde/vermelho o extrato bruto.
  - Apenas as colunas de "Dif. a Justificar" de lojas com pendência acendem em `text-rose-400`.
  - No topo, o card "Diferença Final" destaca o valor `-R$ 31.897,22` em `text-rose-400` com badge de fora da tolerância.

---

## 4. Critérios de Aceitação Verificáveis
1. **Terminal Gate (Build / Typecheck):**
   - Execução de `npm run build` limpa, com código de saída 0 e sem qualquer aviso de JSX ou tipagem.
2. **Auditoria de Classes Tailwind:**
   - Nenhuma classe `text-[var(--color-accent-light-blue)]`, `text-[var(--color-accent-teal)]`, `text-[var(--color-accent-warning)]` ou `text-[var(--color-primary)]` aplicada a valores monetários em `ResumoDiaPanel.tsx`.
   - `valorDispContasCalculado` utiliza estritamente `text-white font-mono`.
   - `contasManualValor` utiliza estritamente `text-white font-mono`.
   - `StoreCardModulo1` exibe `redeTotalValor`, `patioOsValor`, `entradasRealizadasValor` e `saidasOfxValor` em `text-white font-mono`.
