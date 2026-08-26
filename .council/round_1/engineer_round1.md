# Round 1 — Engineer (Pragmático / Executor)

## 1. Diagnóstico de Engenharia: A Discrepância Real vs Percepção
O problema não é uma falha matemática do sistema, mas sim a confusão entre duas grandezas distintas que a contabilidade e a engenharia de software precisam separar com clareza cirúrgica:
1. **Fluxo Operacional do Período (DRE / Variação de Caixa):** Quanto a loja gerou de valor novo no dia (`+R$ 6.000,00` via OSs, PIX, Cartão).
2. **Posição Patrimonial Instantânea (Balanço / Saldo de Conta):** Quanto a conta corrente física possui em determinado instante (`-R$ 1.000,00` no banco, vindo de um saldo inicial de `-R$ 7.000,00`).

Se tentarmos forçar que o saldo final do extrato bancário reflita o faturamento do dia sem considerar o saldo inicial de abertura (abertura negativa), o sistema gerará falsas divergências e alarmes espúrios de conciliação.

---

## 2. Modelagem Matemática Sem Gambiarra (Consistência Multi-Loja)

A equação fundamental de fechamento diário de qualquer conta corrente é determinística:
$$\text{Saldo Final} = \text{Saldo Inicial} + \text{Entradas Operacionais} - \text{Saídas/Encargos}$$

Aplicando ao caso prático:
- **Saldo Inicial (Abertura):** $-\text{R\$\ } 7.000,00$
- **Entradas do Dia (Rede + PIX + Espécie):** $+\text{R\$\ } 6.000,00$
- **Saídas / Encargos do Dia:** $-\text{R\$\ } 0,00$
- **Saldo Final Calculado:** $-\text{R\$\ } 1.000,00$
- **Saldo Real OFX Lido:** $-\text{R\$\ } 1.000,00$
- **Divergência de Conciliação:** $\text{R\$\ } 0,00 \implies \mathbf{STATUS:\ CONCILIADO\ (VERDE)}$

### Como isso se encaixa na cadeia do Módulo 1 (`modulo1Calculations.ts`):
No motor de cálculo consolidado (`calculateModulo1Saldo`):
- `saldo_g13` (Banco Itaú): Deve registrar o saldo real contábil (ex: `-1000.00`).
- `caixa_anterior`: Registra o caixa consolidado do dia anterior (ex: `-7000.00`).
- `caixa_atual_g21`: Registra o caixa consolidado de hoje (ex: `-1000.00`).
- `fluxo_caixa_g23` = $\text{Caixa Atual} - \text{Caixa Anterior} = (-1000) - (-7000) = \mathbf{+6000.00}$.
- `faturamento_liquido_g25` = $\mathbf{+6000.00}$.
- `disponivel_contas_g29` = $\text{Faturamento} - \text{Fluxo CX} = 6000 - 6000 = \mathbf{0.00}$.

> **Conclusão Matemática:** A matemática já fecha perfeitamente por definição algébrica! O fluxo de caixa foi exatamente $+6\text{k}$ (reduziu a dívida de $7\text{k}$ para $1\text{k}$), o faturamento foi $+6\text{k}$ e a diferença líquida de caixa livre é zero. Não quebra as outras lojas nem o consolidado global.

---

## 3. Gargalos Técnicos de Execução no Mundo Real

Para que isso funcione no chão de fábrica sem suporte humano diário, temos 3 gargalos práticos imediatos:

### Gargalo 1: Normalização de Saldo no Parser de OFX (`<BALAMT>`)
- **Problema:** Certos bancos (Itaú, Santander, Bradesco) exportam no campo `<BALAMT>` o saldo já somado ao limite contratado de cheque especial (ex: se o saldo é $-1\text{k}$ e o limite é $5\text{k}$, o banco exporta $+4\text{k}$ de "saldo disponível").
- **Solução Rápida:** No parser de importação de OFX/Extrato, capturar explicitamente o saldo contábil líquido (`LEDGER_BAL` ou subtrair o `limite_credito` cadastrado na loja se o banco injetar limite no disponível).

### Gargalo 2: Encargos Ocultos de Cheque Especial (IOF e Juros Noturnos)
- **Problema:** Quando a conta amanhece negativa, o banco debita automaticamente na virada do mês ou da quinzena rubricas como `IOF CHEQUE ESP`, `JUROS S/ LIMITE`, `ENCARGOS CT/CORRENTE`. Se essas linhas caírem no extrato sem match de OS, o sistema aponta "Saída Órfã / Divergência".
- **Solução Rápida:** Regra de Auto-Categorização via Regex no Extrato:
  ```typescript
  const IS_FINANCIAL_EXPENSE = /JUROS|IOF|ENCARGO|LIM.*ROT|CHEQ.*ESP|TAR.*CTA/i;
  ```
  Se a transação bater com essa regex, categorizar automaticamente como `Despesa Financeira / Encargos de Limite` e computar em `juros_atual` / `valor_contas`, sem alarmar o operador como erro de OS.

### Gargalo 3: A Psicologia do Operador da Loja (UX Pragmática)
- **Problema:** O operador da loja olha para o extrato de $-R\$\ 1.000$ e reclama: *"Trabalhei o dia todo, vendi R$ 6.000 e meu saldo está negativo? O sistema sumiu com meu faturamento!"*.
- **Solução de UX (Visão Dupla de Fechamento):**
  Dividir o painel da loja em dois blocos visuais complementares:
  1. **Card de Performance Operacional (O que a loja produziu hoje):**
     - `Entradas Operacionais do Dia:` **+R$ 6.000,00** (Verde / Ícone de Vendas / 100% Conciliado com OSs).
     - `Destinação:` Amortização de Passivo / Cheque Especial.
  2. **Card de Posição Bancária & Limite (A saúde da conta):**
     - `Saldo Inicial (Abertura):` $-\text{R\$\ } 7.000,00$
     - `Amortização Automática:` $+\text{R\$\ } 6.000,00$
     - `Saldo em Conta Corrente:` $-\text{R\$\ } 1.000,00$
     - `Limite Utilizado:` $\text{R\$\ } 1.000,00$ de $\text{R\$\ } 10.000,00$ contratados.
     - `Status da Conciliação:` **CONCILIADO — 0 Centavos de Divergência**.

---

## 4. Plano de Ação Pragmático (Quick Wins de Implementação)

1. **Schema Supabase:**
   - Adicionar campo `limite_cheque_especial` na tabela `stores` (numérico, default 0).
   - Garantir que a tabela `reconciliations` registre `saldo_inicial_banco` e `saldo_final_banco` para auditoria do delta.
2. **Motor de Cálculo (`modulo1Calculations.ts`):**
   - Manter a regra atual de que saldos bancários negativos entram algebricamente somando/subtraindo naturalmente na soma vetorial de lojas.
3. **Frontend Component (`StoreExtratoBancarioView.tsx` e `ResumoDiaPanel.tsx`):**
   - Exibir badge explicativo quando `saldo_banco_itau < 0`: `"Operando em Limite Rotativo — R$ X,XX amortizados hoje"`.
   - Adicionar breakdown no modal de fechamento mostrando: `Saldo Inicial + Entradas - Saídas = Saldo Final`.

## 5. Veredito do Engineer
Não precisamos reconstruir o banco de dados nem criar um sistema de contabilidade analítica pesada. O modelo atual de variação delta ($Caixa_{Hoje} - Caixa_{Ontem}$) resolve 100% da matemática. O esforço deve ser **80% em clareza de UX/Labels para o operador e 20% em parsing de encargos financeiros do extrato**.
