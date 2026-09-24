# 📋 Proposta Técnica — Spec 437: Padronização Visual da Tela de Conciliação & Eliminação da "Salada de Cores"

## 1. Problema Diagnosticado
A tela principal de Conciliação Diária (`/conciliacao`) sofre de poluição cromática ("salada de cores"), com uso arbitrário de múltiplos tons heterogêneos para valores que são apenas métricas nominais/estáticas (ex.: Saldo Bancos em azul-celeste, Dinheiro MP em teal, A Receber em roxo/índigo, Pátio em âmbar, Contas Manual em vermelho, sub-chips com fundos amarelos e verdes saturados, e extratos de filiais em ciano). 

Essa dispersão visual:
1. Viola o Design System canônico (`Zinc-950` / `Shadcn/ui` com tokens semânticos).
2. Dificulta a escaneabilidade contábil rápida: o operador não consegue distinguir imediatamente o que é um **valor fiduciário estático** do que é um **resultado de cálculo / divergência**.
3. Gera conflito cognitivo ao pintar despesas e saldos nominais com as mesmas cores de alertas de erro ou sucesso.

---

## 2. Solução Proposta & Regras Canônicas Visuais
Implementar a regra visual estrita solicitada pelo usuário:
1. **Números Normais (Valores Informativos / Estáticos / Patrimônio):**
   - **Cor obrigatória:** Branco puro / `text-white font-mono` (ou `text-foreground`).
   - Aplica-se a:
     - Topo 4 Cards: Saldo Bancos consolidado, Dinheiro MP, A Receber (Boletos) e Na Loja OS (Pátio).
     - Sub-chips de apoio: Extrato OFX Positivo, Dinheiro no Cofre e Cartões a Compensar.
     - Top Bar: Apurado Sistema e Entradas OFX.
     - Esteira Contábil: Caixa Atual, Caixa Anterior, Faturamento do Dia e Subtotal de Contas a Cobrir.
     - Cards das Filiais (`StoreCardModulo1`): Rede Total, Saldo em Pátio, OFX Entradas, Conciliado Entradas, Saídas OFX e Contas/Boletos.
2. **Campos de Cálculo / Apuração de Divergência:**
   - **Cor condicional:**
     - **Verde (`text-emerald-400` / `text-emerald-500`):** Quando o resultado for positivo, superavitário ou conforme ($\le \text{R\$} 0,05$ ou dentro da tolerância de fechamento).
     - **Vermelho (`text-rose-400` / `text-rose-500`):** Quando o resultado for negativo, deficitário ou com divergência a justificar.
   - Aplica-se a:
     - **Fluxo de Caixa:** $\text{Caixa Atual} - \text{Caixa Anterior}$ (Verde se $\ge 0$, Vermelho se $< 0$).
     - **Diferença Final:** $\text{Valor Disp. Contas} - \text{Subtotal Contas}$ (Verde se conforme em $\pm \text{R\$} 50$, Vermelho se fora).
     - **Diferença de Entradas por Loja:** $\text{OFX Entradas} - \text{Conciliado}$ (Verde se conforme $\le 0,05$, Vermelho se crédito órfão pendente).
     - **Diferença de Saídas por Loja:** $\text{OFX Saídas} - \text{Contas Conciliadas}$ (Verde se conforme $\le 0,05$, Vermelho se débito órfão pendente).
     - **Saldo Bancário da Loja (OFX):** Branco se positivo/neutro; Vermelho (`text-rose-400`) apenas se estiver negativo (cheque especial devedor).
3. **Exceções Expressas Determinadas pelo Usuário:**
   - **Valor Disponível para Contas (`valor_disp_contas`):** Deixar em **branco normal** (`text-white font-mono`), sem a coloração azul/brilhante atual.
   - **Contas (Manual) (`contas_manual` / `subtotal_contas`):** Deixar em **branco normal** (`text-white font-mono`), removendo o vermelho alarmista e os hovers saturados.

---

## 3. Skills Especializadas Aplicadas
- `frontend-design-pro`: Padrões de Dark UI Zinc-950, eliminação de AI Slop cromático, superfícies por luminância e conformidade com tokens semânticos.
- `ui-components`: Tipografia mono tabular, badges discretos e hierarquia de superfícies Nível 0, Nível 1 e Nível 2.

---

## 4. Contratos de Dados & Interfaces Afetadas
Nenhuma alteração de schema, migration ou RPC é necessária. O contrato de dados retornado por `get_daily_reconciliation_summary` e `useDailyReconciliationSummary` permanece 100% idêntico. As alterações são estritamente nas classes utilitárias Tailwind de apresentação visual.

---

## 5. Arquivos Afetados
### [Arquivos Existentes Modificados]
- `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - Padronizar os 4 cards de topo para `text-white font-mono`.
  - Normalizar sub-chips para bordas e textos neutros (`border-[var(--border-subtle)] text-white`).
  - Remover cores arbitrárias em Entradas OFX, Faturamento, Valor Disp. Contas e Contas Manual (ambos para `text-white font-mono`).
  - Garantir cálculo de cores estrito em Fluxo de Caixa e Diferença Final (`emerald-400` / `rose-400`).
- `src/components/conciliacao/StoreCardModulo1.tsx`:
  - Normalizar Saldo Banco (branco se positivo, vermelho se devedor), Rede Total (branco) e Saldo em Pátio (branco).
  - Normalizar OFX Entradas e Saídas OFX para `text-white font-mono`.
  - Manter Dif. a Justificar com verde conforme (`text-emerald-400`) ou vermelho divergente (`text-rose-400`).

---

## 6. Plano de Rollback
Caso qualquer alteração visual gere insatisfação estética ou inconsistência de renderização, o rollback é 100% seguro e imediato via git:
```bash
git checkout HEAD -- src/components/conciliacao/ResumoDiaPanel.tsx src/components/conciliacao/StoreCardModulo1.tsx
```
Sem impacto no banco de dados ou integridade fiduciária.

---

## 7. Risco Principal & Mitigação
- **Risco:** Reduzir contraste de legibilidade em telas com iluminação alta ou remover contexto visual de alerta crítico.
- **Mitigação:** Utilizar `text-white` com `font-mono` e `tabular-nums` de alto contraste sobre as superfícies `Zinc-900` (`bg-card` / `bg-surface-elevated`), preservando badges semânticos e alertas de divergência onde houver ação necessária do operador.
