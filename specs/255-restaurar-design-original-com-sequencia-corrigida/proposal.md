# Proposta: Restauração do Design Visual dos Cards com a Sequência Correta (Spec 255)

---

## 1. 🎯 O que será feito

Restauraremos **exatamente a mesma estética visual e design de cards que você já aprovou anteriormente**, apenas ajustando a **sequência lógica interna dos cards de consolidação** para seguir o encadeamento correto:

---

## 2. 📐 Estrutura dos Cards

### Topo: 4 Pilares de Patrimônio (Design Original de 5 colunas com Saldo col-span-2)
* **Card 1 (col-span-2):** `SALDO BANCOS + DINHEIRO` com chips de OFX e Dinheiro no Cofre.
* **Card 2:** `DINHEIRO MP` com ícone de carteira e subtexto "Preenchido na importação".
* **Card 3:** `A RECEBER` com ícone de recibo e subtexto "Boletos / Descontos manuais".
* **Card 4:** `NA LOJA OS` com badge âmbar "Ver OSs ↗" e subtexto "OSs do Pátio pendentes".

---

### Seção Principal: Consolidação do Dia (Cards Individuais no Design Original na Sequência Certa)
Grid de 6 cards (3 colunas x 2 linhas) com a sequência exata:

```
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│ 1. CAIXA ATUAL         │  │ 2. CAIXA ANTERIOR      │  │ 3. FLUXO DE CAIXA      │
│ R$ 150.599,79          │  │ R$ 271.922,90          │  │ -R$ 121.323,11         │
│ Patrimônio disponível  │  │ Fechamento anterior    │  │ Caixa Atual - Caixa Ant│
└────────────────────────┘  └────────────────────────┘  └────────────────────────┘

┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│ 4. FATURAMENTO DO DIA  │  │ 5. VALOR DISP. CONTAS  │  │ 6. CONTAS (MANUAL)     │
│ R$ 76.858,12           │  │ R$ 198.181,23          │  │ R$ 195.066,04          │
│ OI: 63,5k + Ajustes    │  │ Faturamento + |Fluxo|  │  │ Juros: R$ 3.115,41     │
│ (Ver Detalhes ↗)       │  │ (Fórmula encadeada)    │  │ (Ver Contas ↗)         │
└────────────────────────┘  └────────────────────────┘  └────────────────────────┘
```

* **Barra Inferior:** `Subtotal: Total de Contas a Cobrir` ➔ `R$ 198.181,45`.
* **Card Lateral:** `Diferença Final: -R$ 0,22` com badge `Fechamento Conforme (tolerância ± R$ 50)`.

---

## 3. 📋 Arquivo a Modificar
* [`src/components/conciliacao/ResumoDiaPanel.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/ResumoDiaPanel.tsx)
