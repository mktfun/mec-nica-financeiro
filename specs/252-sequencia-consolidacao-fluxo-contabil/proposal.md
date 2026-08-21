# Proposta: Reestruturação da Sequência da Consolidação do Dia e Correção do Estorno de Cartão (Spec 252)

---

## 1. 🔍 O que foi Identificado

### A. Falta do Estorno de Cartão (R$ 3.342,24) no Valor Disp. Contas:
* No cálculo do frontend, `valorDispContasCalculado` estava pegando apenas `Faturamento OI (R$ 63.515,88) + Aporte (R$ 10.000,00) = R$ 73.515,88`, **deixando de fora o Estorno de Cartão (R$ 3.342,24)**.
* Isso resultava em `R$ 73.515,88 - (-R$ 121.323,11) = R$ 194.838,99`.
* Faltando exatamente **R$ 3.342,24** para atingir **R$ 198.181,23**.

### B. Sequência dos Cards de Consolidação Fora da Ordem Lógica do Excel:
* No Excel, o raciocínio contábil segue uma **esteira sequencial clara em 4 passos**:
  1. **Passo 1 (Variação Patrimonial / Fluxo de Caixa):**
     `Caixa Atual (R$ 150.600,29) - Caixa Anterior (R$ 271.922,90) = Fluxo de Caixa: -R$ 121.322,61`
  2. **Passo 2 (Composição da Receita do Dia):**
     `Faturamento OI (R$ 63.515,88) + Aporte (R$ 10.000,00) + Estorno (R$ 3.342,24) = Faturamento Consolidado: R$ 76.858,12`
  3. **Passo 3 (Capacidade de Pagamento / Disponível Contas):**
     `Faturamento Consolidado (R$ 76.858,12) + |Fluxo de Caixa| (R$ 121.322,61) = Valor Disponível: R$ 198.180,73`
  4. **Passo 4 (Total de Contas Pagas & Batimento):**
     `Contas Manual (R$ 195.066,04) + Juros REDE (R$ 3.115,41) = Subtotal Contas: R$ 198.181,45`
     ➔ **Diferença Final: -R$ 0,72 (Fechamento Conforme ✅)**

---

## 2. 🎨 Novo Layout Proposto para a Seção "Consolidação do Dia"

Em vez de uma grade desordenada de caixas isoladas, reorganizaremos a seção em **3 Blocos Sequenciais Conectados com Setas de Fluxo (Stepper Contábil)**:

### Bloco Superior: Os 4 Pilares do Patrimônio
* **SALDO BANCOS + DINHEIRO (Horizontal 2 cols):** `R$ 28.416,07`
* **DINHEIRO MP:** `R$ 8.466,00`
* **A RECEBER:** `R$ 10.694,00`
* **NA LOJA OS (PÁTIO):** `R$ 103.023,72`

### Bloco Principal: Esteira Sequencial de Consolidação (Passo a Passo)
```
[ 1. FLUXO DE CAIXA ] ───────► [ 2. FATURAMENTO TOTAL ] ───────► [ 3. DISPONÍVEL CONTAS ] ───────► [ 4. DIFERENÇA FINAL ]
 Caixa Atual: R$ 150.600,29     OI Base:  R$ 63.515,88           Faturamento: R$  76.858,12        |Valor Disp|: R$ 198.180,73
 Caixa Ant:   R$ 271.922,90     Aporte:  +R$ 10.000,00         + |Fluxo Caixa|: R$ 121.322,61     - Total Contas: R$ 198.181,45
 ──────────────────────────     Estorno: +R$  3.342,24           ──────────────────────────        ───────────────────────────
 = Fluxo:    -R$ 121.322,61     = Total:  R$ 76.858,12           = Disp. Contas: R$ 198.180,73     = DIFERENÇA:  -R$ 0,72 ✅
```

* **Card de Contas (Manual) & Juros:** Ficará claramente posicionado logo abaixo do Disponível de Contas como a contrapartida direta das saídas do dia (`Contas R$ 195.066,04 + Juros Rede R$ 3.115,41 = R$ 198.181,45`).

---

## 3. 📋 Arquivos a Modificar

1. [`src/components/conciliacao/ResumoDiaPanel.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/ResumoDiaPanel.tsx):
   - Corrigir a fórmula de Faturamento Total para garantir a soma de todos os ajustes de receita (`daily_revenue_adjustments`).
   - Reorganizar os cards na ordem sequencial da esteira contábil com badges explicativos de cada etapa ($1 \to 2 \to 3 \to 4$).

---

## 4. ✅ Critérios de Aceite

1. `Valor Disp. Contas` exibirá exatamente **`R$ 198.180,73`** (ou `R$ 198.181,23` com os centavos do OFX).
2. A `Diferença Final` exibirá **`-R$ 0,72`** (ou `-R$ 0,22`), com badge verde de **Fechamento Conforme**.
3. A sequência visual dos cards seguirá rigorosamente a ordem lógica do Excel ($1^\circ\ \text{Fluxo de Caixa} \to 2^\circ\ \text{Faturamento} \to 3^\circ\ \text{Disponível Contas} \to 4^\circ\ \text{Contas Pagas} \to 5^\circ\ \text{Diferença}$).
