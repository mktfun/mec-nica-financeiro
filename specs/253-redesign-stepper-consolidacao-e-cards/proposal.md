# Proposta: Redesign Premium dos Cards Superiores e Sequência Encadeada da Consolidação (Spec 253)

---

## 1. 🔍 O que vamos resolver

1. **Eliminar o espaço vazio nos Cards Superiores:**
   * O card `SALDO BANCOS` com 2 andares forçava os outros 3 cards (`DINHEIRO MP`, `A RECEBER`, `NA LOJA OS`) a esticarem a altura no CSS Grid, deixando um grande vazio preto no meio deles.
   * **Solução:** Grid balanceado de 4 colunas de altura uniforme, com badges horizontais modernos e sem vazios.

2. **Corrigir a Sequência Lógica dos Cards da Consolidação (Ordem do Excel):**
   * Atualmente o card `CONTAS (MANUAL)` está no meio da linha 2, antes de `VALOR DISP. CONTAS`.
   * **Nova Sequência em 3 Passos Climatizados:**
     * **Passo 1 (Variação de Caixa):** `Caixa Atual` - `Caixa Anterior` = **`Fluxo de Caixa`**
     * **Passo 2 (Capacidade Gerada):** `Faturamento do Dia` + `|Fluxo de Caixa|` = **`Valor Disp. Contas`**
     * **Passo 3 (Obrigações & Saídas):** `Contas (Manual)` + `Juros REDE` = **`Total de Contas a Cobrir`**
     * **Passo 4 (Diferença Final):** `Valor Disp. Contas` - `Total de Contas` = **`-R$ 0,22` (Conforme ✅)**

---

## 2. 🎨 Mockup do Novo Design

### A. 4 Pilares Superiores (Grid 4 colunas, altura uniforme e elegante)
```
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│ SALDO BANCOS + DINHEIRO │ │ DINHEIRO MP             │ │ A RECEBER               │ │ NA LOJA OS (PÁTIO)      │
│ R$ 28.416,07            │ │ R$ 8.466,00             │ │ R$ 10.694,00            │ │ R$ 103.023,72           │
│ OFX: 23,5k • Cofre: 4,8k│ │ Conferido na importação │ │ Boletos / Carteira      │ │ 11 OSs • Ver OSs ↗      │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

### B. Consolidação do Dia (Esteira Lógica Encadeada)
```
┌────────────────────────────────────────────────────────────────────────┐ ┌──────────────────────────────┐
│ CONSOLIDAÇÃO DO DIA & FLUXO CONTÁBIL                                   │ │ DIFERENÇA FINAL              │
│                                                                        │ │                              │
│ 1. VARIAÇÃO DE CAIXA:                                                  │ │       -R$ 0,22               │
│ [ Caixa Atual: 150.599,79 ] - [ Caixa Ant: 271.922,90 ]                │ │                              │
│ ➔ = FLUXO DE CAIXA: -R$ 121.323,11                                     │ │  Fechamento Conforme         │
│                                                                        │ │  (Tolerância ± R$ 50)        │
│ 2. RECURSO DISPONÍVEL (FATURAMENTO + FLUXO):                           │ │                              │
│ [ Faturamento Total: 76.858,12 ] + [ |Fluxo Caixa|: 121.323,11 ]       │ │  Auditoria:                  │
│ ➔ = VALOR DISP. CONTAS: R$ 198.181,23                                  │ │  Fechamento de 21/08 aprovado│
│                                                                        │ │  com diferença residual de   │
│ 3. TOTAL DE CONTAS A COBRIR:                                           │ │  R$ -0,22 dentro da margem.  │
│ [ Contas Manual: 195.066,04 ] + [ Juros REDE: 3.115,41 ]               │ │                              │
│ ➔ = TOTAL DE CONTAS: R$ 198.181,45                                     │ │                              │
└────────────────────────────────────────────────────────────────────────┘ └──────────────────────────────┘
```

---

## 3. 📋 Arquivos a Modificar

* [`src/components/conciliacao/ResumoDiaPanel.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/ResumoDiaPanel.tsx):
  - Refatoração do grid dos 4 pilares superiores para 4 colunas uniformes (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
  - Reorganização dos cards de consolidação no formato de 3 linhas encadeadas (Passo 1: Caixa ➔ Passo 2: Faturamento & Disponível ➔ Passo 3: Contas & Juros).
