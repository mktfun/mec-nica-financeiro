# 🛠️ Análise de Implementação — [Engineer]
**Council Debate:** Módulo de Recebíveis (Pilar 3) — Round 1  
**Autor:** Engenheiro de Software & Executor Pragmático  
**Data:** 25/08/2026  
**Status:** Proposta de Implementação Técnica

---

## 1. Viabilidade dos 4 Tópicos & Quick Wins

Como engenheiro focado em entrega contínua, simplicidade operacional e valor imediato para as 10 lojas, analiso a viabilidade de cada um dos quatro desafios técnicos apresentados:

### Tópico 1 — Ciclo de Vida e Sinalização no Dia do Vencimento (`due_date == today`)
* **Viabilidade:** **Altíssima / Baixo Esforço (1h - 2h)**.
* **Diagnóstico Pragmático:**
  * Notificações complexas (toasts flutuantes persistentes, web push, central de alertas com controle de leitura em banco) geram sobrecarga de código (*over-engineering*), fadiga de alertas para os operadores de loja e complexidade de sincronização desnecessária.
  * A melhor ergonomia visual e de código é puramente declarativa no frontend:
    1. **Top Banner Condicional em `/recebiveis`:** Se houver títulos pendentes com `due_date <= today`, renderizar banner sutil no topo: `⚠️ 3 títulos vencendo hoje/vencidos totalizando R$ 3.764,83 — [Filtrar para Baixa]`.
    2. **Badges de Status Semânticos & Pulsantes:**
       * `due_date < today && status === 'pendente'` ➔ `Badge variant="danger"` (**Vencido**).
       * `due_date === today && status === 'pendente'` ➔ `Badge variant="warning" className="animate-pulse"` (**Vence Hoje**).
       * `due_date > today && status === 'pendente'` ➔ `Badge variant="neutral"` (**A Vencer**).
       * `status === 'recebido'` ➔ `Badge variant="success"` (**Recebido**).
    3. **No Cockpit Diário (`ResumoDiaPanel.tsx`):** Adicionar drill-down modal (`RecebiveisDetailModal.tsx`) com link `Ver Títulos ↗` idêntico ao já existente em *Saldo Bancos* e *Na Loja OS*, exibindo badge âmbar quando houver títulos do dia.

---

### Tópico 2 — Mecânica Contábil da Baixa e Liquidação
* **Viabilidade:** **Alta / Esforço Médio (2h - 3h)**.
* **Diagnóstico Pragmático:**
  * **Auto-Match Cego é um Risco Inaceitável:** Casar automaticamente transações OFX com recebíveis apenas por valor numérico gera falsos positivos graves (ex: um crédito PIX de R$ 300,00 de adiantamento de cliente pode liquidar indevidamente um boleto corporativo de R$ 300,00 da Massimo Pedras, mascarando a inadimplência).
  * **Modelo Recomendado: Híbrido Pragmático (Baixa Manual com 1 Clique + Sugestão Visual de Match OFX):**
    * Operador visualiza a lista da filial. Ao lado de cada título pendente, há um botão de ação rápida `[Dar Baixa]`.
    * Se o extrato OFX do dia contiver crédito com valor compatível (`abs(ofx.amount - rec.value) < 0.02`), a interface destaca uma tag/chip inteligente: `💡 Crédito OFX detectado: R$ X (Banco Itaú) - [Vincular & Baixar]`.
    * Ao baixar, o sistema atualiza `status = 'recebido'`, `received_at = now()`, e armazena opcionalmente `matched_ofx_id`.
    * A baixa é 100% reversível com 1 clique (`[Reabrir / Desfazer]`), garantindo tolerância a erros operacionais.

---

### Tópico 3 — Isolamento Temporal & Cache Mutations (React Query)
* **Viabilidade:** **Altíssima / Baixo Esforço (1h - 2h)**.
* **Diagnóstico Pragmático:**
  * Os snapshots consolidados de dias anteriores (`daily_snapshots.is_closed = true`, ex: 17, 18, 19, 21, 24/08) já estão congelados e são retornados diretamente pelo Ramal 1 da RPC `get_daily_reconciliation_summary`. Baixar um título hoje **não afeta nem recalcula o passado**.
  * Para o cálculo dinâmico em tempo real de dias abertos (Ramal 2 da RPC), a agregação de `v_a_receber` deve respeitar a linha do tempo:
    ```sql
    SELECT COALESCE(SUM(value), 0)
    INTO v_a_receber
    FROM receivables
    WHERE date <= v_target_date
      AND (
        status = 'pendente'
        OR (status = 'recebido' AND received_at IS NOT NULL AND received_at::date > v_target_date)
      );
    ```
  * **No React Query (`useRecebiveis.ts`):** A mutação `useMarkReceived` executa update otimista local e invalida as chaves `['receivables']`, `['receivables_summary']` e `['daily-reconciliation-summary', targetDate]`. Zero re-render cascata ou instabilidade.

---

### Tópico 4 — Implementação do Parser Excel (`RECEBIVEIS `) e Componentes
* **Viabilidade:** **Alta / Esforço Médio (3h - 4h)**.
* **Diagnóstico Pragmático:**
  * As planilhas `CONCILIAÇÃO *.xlsx` possuem pequenas variações humanas (espaços no nome da aba como `'RECEBIVEIS '`, formatos de data em string `DD/MM/YYYY` ou número serial do Excel, formatações de moeda `R$ 3.464,83`).
  * O parser `src/lib/parsers/recebiveisParser.ts` deve ser defensivo:
    1. Localização flexível da aba por regex: `/^RECEBIVE?IS?\s*$/i`.
    2. Identificação das colunas-chave por cabeçalho (`Loja / Filial`, `Descrição / Título`, `OS`, `Parcela`, `Tipo`, `Valor`, `Vencimento`).
    3. Suporte a layouts por blocos de filiais (análogo ao `jurosRedeParser.ts` e `mapaMetasParser.ts`).
    4. Higienização numérica com `extractNumber` e normalização segura de datas.
  * **Componentização Modular:**
    * `StoreReceivablesCard.tsx`: Exibição agrupada por loja com cabeçalho compacto, total pendente, listagem colapsável de títulos e ações rápidas.
    * `ReceivableFormModal.tsx`: Modal rápido para lançamentos manuais esporádicos.
    * `ImportRecebiveisModal.tsx`: Drag & drop dedicado na rota `/recebiveis` e plug no `CentralImportWizard.tsx`.

---

### 🚀 Quick Wins (Ordenados por ROI: 80% do Valor com 20% do Esforço)

| Prioridade | Quick Win | Esforço Est. | Impacto Imediato |
|---|---|:---:|---|
| **#1** | **Migration de Colunas em `receivables` (`description`, `os_number`, `installment`, `matched_ofx_id`)** | 30 min | Desbloqueia persistência analítica dos títulos corporativos reais (Orion, Massimo, Gestauto). |
| **#2** | **Parser Robusto `recebiveisParser.ts`** | 2h | Elimina digitação manual cega; extrai os R$ 11.814,50 automaticamente da planilha de 25/08. |
| **#3** | **Card por Loja (`StoreReceivablesCard.tsx`) com Baixa Manual em 1 Clique** | 2h | Dá autonomia imediata para os gerentes/operadores das 10 lojas sem atrito. |
| **#4** | **Drill-down Modal no `ResumoDiaPanel.tsx` (`RecebiveisDetailModal.tsx`)** | 1h | Conecta o Pilar 3 da Conciliação Diária à lista analítica de títulos por filial. |
| **#5** | **Sugestão Visual de Match OFX (Tag Informativa no Card)** | 1.5h | Agiliza conferência sem risco de falso positivo do auto-match cego. |

---

## 2. Mecânica de Baixa Recomendada

```
┌─────────────────────────────────────────────────────────────────────────┐
│              FLUXO HÍBRIDO PRAGMÁTICO DE LIQUIDAÇÃO                     │
└─────────────────────────────────────────────────────────────────────────┘

  [Planilha CONCILIAÇÃO *.xlsx] (Aba 'RECEBIVEIS ')
                 │
                 ▼ (Parser Automático)
  [Tabela 'receivables'] ──► Status: 'pendente' ──► Soma no PILAR 3 (A Receber)
                 │
                 ▼
  [Cockpit de Recebíveis / Conciliação]
  ┌─────────────────────────────────────────────────────────────────────┐
  │ Mauá (MHE)                                                          │
  │ • BOLETO ORION OS 22529 1/3 — R$ 3.464,83 (Venc: 24/08) [Vencido]   │
  │   💡 Sugestão: Crédito OFX R$ 3.464,83 em 25/08 (Itaú)              │
  │   [ Vincular ao OFX & Baixar ]   [ Baixa Manual ]                   │
  └─────────────────────────────────────────────────────────────────────┘
                 │
                 ▼ (Clique do Operador)
  [Mutação: useMarkReceived]
  • status = 'recebido'
  • received_at = now() / target_date
  • matched_ofx_id = ofx_transaction_id (se vinculado)
                 │
                 ▼
  [Efeito Contábil no Dia Aberto]
  • Sai do PILAR 3 (A Receber)
  • Já está refletido no PILAR 1 (Saldo Bancos OFX)
  • Partidas dobradas equilibradas (Zero Duplicação de Faturamento)
```

### Regras de Execução:
1. **Conservação Patrimonial:** Quando um recebível é marcado como `recebido`, seu valor deixa de compor o Pilar 3 ("A Receber") na apuração dinâmica do dia. O dinheiro passa a ser computado no Pilar 1 (Saldo Bancos Itaú via OFX) ou no Cofre da Loja.
2. **Prevenção de Duplicidade:** Não criar nova transação de receita no faturamento quando houver a baixa; o faturamento foi apurado na competência original (OS do pátio ou faturamento corporativo). A liquidação é meramente financeira/patrimonial.
3. **Reversibilidade Garantida:** A qualquer momento, se um operador cometer um engano, o botão `[Reabrir Título]` restaura `status = 'pendente'`, `received_at = null`, `matched_ofx_id = null`, recalculando imediatamente o Pilar 3.

---

## 3. Riscos de Execução & Regressão

| Risco Identificado | Severidade | Probabilidade | Estratégia Pragmática de Mitigação |
|---|:---:|:---:|---|
| **1. Falsos Positivos com Auto-Match Cego** | Alta | Alta | **Rejeitar Auto-Match Cego.** Utilizar exclusivamente o modelo híbrido com sugestão visual e confirmação humana em 1 clique. |
| **2. Contaminação de Fechamentos Históricos** | Crítica | Baixa | A RPC de conciliação isola dias fechados (`is_closed = true`), servindo os valores congelados diretamente da tabela `daily_snapshots`. A baixa no dia atual altera apenas o dia aberto. |
| **3. Divergências de Nomes de Abas e Colunas no Excel** | Média | Média | Parser tolerante: regex case-insensitive e trim para `'RECEBIVEIS '`, detecção dinâmica de índice de colunas por palavras-chave (`loja`, `descri`, `venc`, `valor`). |
| **4. Duplicidade de Lançamento em Re-importações** | Média | Alta | Chave natural de deduplicação idempotente no upsert: `store_id + description + due_date + round(value, 2)`. Re-importar a mesma planilha apenas atualiza os registros existentes sem duplicar. |
| **5. Lentidão com Muitas Filiais** | Baixa | Baixa | Criação de índices dedicados: `idx_receivables_store_date_status` e `idx_receivables_due_date`. Carga agregada por filial em uma única consulta otimizada. |

---

## 4. Recomendação Final

**Veredicto:** **GO**  
**Confiança:** **0.95**  

**Justificativa:**  
A arquitetura proposta resolve uma lacuna crítica do sistema (elimina a digitação manual cega do Pilar 3 de R$ 11.814,50) com baixíssimo risco de regressão. O caminho técnico é direto: migration simples de colunas, parser Excel tolerante a variações reais das 10 lojas, UI limpa baseada em cards por filial com badges semânticos e baixa manual em 1 clique assistida por sugestões do OFX. A solução entrega 100% de precisão contábil, respeita a imutabilidade dos fechamentos históricos e exige menos de 8 horas totais de implementação.
