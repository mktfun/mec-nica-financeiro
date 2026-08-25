# 📄 Documento Técnico: Especificação e Desafio Arquitetural do Módulo de Recebíveis (Spec 284)

**Projeto:** Sistema Financeiro & Conciliação Contábil Multi-Filiais  
**Data:** 25/08/2026  
**Contexto de Negócio:** Gestão e Liquidação de Recebíveis por Filial com Integração Contábil ao Fechamento Diário de Caixa.

---

## 1. Contexto Geral & O Problema

O sistema realiza o fechamento contábil diário de **10 filiais automotivas** através da fórmula patrimonial:
$$\text{Caixa Atual} = \underbrace{\text{Saldo Bancos (OFX) + Dinheiro Cofre + Maquininhas a Compensar}}_{\text{Pilar 1}} + \underbrace{\text{Dinheiro MP}}_{\text{Pilar 2}} + \underbrace{\text{A Receber}}_{\text{Pilar 3}} + \underbrace{\text{Na Loja (Pátio OS)}}_{\text{Pilar 4}}$$

### A Falha Atual:
- O **Pilar 3 (A Receber)** na tela de Conciliação e no Wizard de Importação depende de digitação manual cega.
- Na operação real, a planilha oficial da empresa (`CONCILIAÇÃO *.xlsx` - aba `RECEBIVEIS `) detalha títulos a receber **loja a loja** (ex: boletos de garantia, faturamento a prazo com clientes corporativos como Orion e Massimo Pedras, parcelas de OSs).
- **Exemplo Real do Dia 25/08/2026:**
  - **Planalto (BRASICAR):** `PGTO EM CONTA - GESTAUTO` -> **R$ 1.120,00** (Vencimento 15/09/2026)
  - **Piraporinha (EMPORIO):** `BOLETO MASSIMO PEDRAS OS 40235` -> **R$ 300,00** (Vencimento 27/08/2026)
  - **Mauá (MHE):**
    - `BOLETO ORION OS 22529 1/3` -> **R$ 3.464,83** (Vencimento 24/08/2026 - *Vencido*)
    - `BOLETO ORION OS 22530 2/3` -> **R$ 3.464,83** (Vencimento 22/09/2026)
    - `BOLETO ORION OS 22531 3/3` -> **R$ 3.464,84** (Vencimento 22/10/2026)
  - **Total Consolidado A Receber:** **R$ 11.814,50**

---

## 2. Mapa Completo de Arquivos do Projeto (Paths)

### 📂 Frontend (React + TanStack Router + Tailwind):
1. `src/routes/recebiveis.tsx` — Página principal da rota `/recebiveis` (substituir pela nova visão estruturada por filial).
2. `src/components/recebiveis/StoreReceivablesCard.tsx` — *[NOVO]* Componente de card por filial (lista de títulos, badges de status, ações rápidas).
3. `src/components/recebiveis/ReceivableFormModal.tsx` — *[NOVO]* Modal para cadastro e edição manual de títulos.
4. `src/components/recebiveis/ImportRecebiveisModal.tsx` — *[NOVO]* Modal de upload e extração da aba `RECEBIVEIS ` de planilhas Excel.
5. `src/lib/parsers/recebiveisParser.ts` — *[NOVO]* Parser TypeScript para ler a aba `RECEBIVEIS ` dos arquivos `CONCILIAÇÃO *.xlsx`.
6. `src/hooks/useRecebiveis.ts` — Hook React Query com consultas e mutações (criação, edição, exclusão, baixa).
7. `src/components/conciliacao/ResumoDiaPanel.tsx` — Cockpit principal de conciliação diária (consome o Pilar 3 "A RECEBER").
8. `src/components/importacoes/CentralImportWizard.tsx` — Wizard central de importação diária.

### 🗄️ Backend (Supabase PostgreSQL + RPCs):
1. `supabase/migrations/20260825000003_receivables_schema_and_rpc.sql` — Migration para campos de detalhamento e índices de performance.
2. Tabela `public.receivables` — Estrutura de persistência relacional.
3. RPC `public.get_daily_reconciliation_summary(p_date, p_force_dynamic)` — Função PL/pgSQL que consolida o resumo diário da conciliação.

---

## 3. Estrutura de Dados da Tabela `public.receivables`

```sql
CREATE TABLE public.receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES public.stores(id),
    store_name TEXT,
    description TEXT NOT NULL,           -- Ex: 'BOLETO ORION OS 22529 1/3'
    os_number TEXT,                      -- Ex: '22529'
    installment TEXT,                    -- Ex: '1/3'
    type TEXT NOT NULL DEFAULT 'Boleto', -- 'Boleto', 'Transferência', 'Cheque', 'Cartão', 'Outros'
    value NUMERIC(12, 2) NOT NULL,       -- Valor em Reais (R$)
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'vencido', 'cancelado')),
    date DATE NOT NULL,                  -- Data de lançamento/competência (YYYY-MM-DD)
    due_date DATE NOT NULL,              -- Data de vencimento (YYYY-MM-DD)
    received_at TIMESTAMPTZ,             -- Timestamp do momento da liquidação/baixa
    matched_ofx_id UUID,                 -- Vínculo opcional com a transação OFX de entrada
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receivables_store_date_status ON public.receivables (store_id, date, status);
CREATE INDEX idx_receivables_due_date ON public.receivables (due_date);
```

---

## 4. O Grande Desafio Arquitetural para Brainstorming com sua IA

Solicitamos que seu agente de IA avalie e proponha a melhor abordagem para os seguintes tópicos numerados:

### Tópico 1 — Ciclo de Vida e Sinalização no Dia do Vencimento (`due_date == today`):
- **Cenário:** O boleto de R$ 3.464,83 da Orion vence hoje (`25/08/2026`).
- **Questão:** Como a interface e o sistema devem alertar visualmente o operador?
  - *Opção A:* Badge amarelo pulsante "Vence Hoje" na listagem da loja com botão "Confirmar Recebimento".
  - *Opção B:* Card de Alerta no topo do Dashboard ("1 título vencendo hoje totalizando R$ 3.464,83").
  - *Opção C:* Notificação toast/banner inteligente no momento em que a data é selecionada.

### Tópico 2 — Mecânica Contábil da Baixa (Semelhante ao Dinheiro em Cofre vs Extrato Bancário):
- **Cenário:** Quando o dinheiro cai no banco (Itaú), a entrada aparece no extrato OFX como um crédito (ex: `PIX RECEBIDO ORION` ou `TED GESTAUTO`).
- **Questão:** Qual é o modelo canônico de liquidação que preserva partidas dobradas sem duplicar faturamento?
  - **Fluxo Proposto 1 (Auto-Match com OFX):** O sistema cruza o valor do recebível com o extrato bancário OFX do dia. Ao encontrar uma entrada equivalente, sugere o match e dá baixa automática no recebível (`status = 'recebido'`, `received_at = now()`, `matched_ofx_id = ofx.id`).
  - **Fluxo Proposto 2 (Baixa Manual com 1 Clique):** O operador clica em "Dar Baixa / Recebido". O sistema atualiza o status para `recebido`, remove o valor do **Pilar 3 (A Receber)** e ele passa a constar como patrimônio já realizado no extrato ou caixa.
  - **Fluxo Proposto 3 (Híbrido):** Permite baixa manual imediata, mas se o OFX do dia contiver o valor, exibe a tag "Conciliado no Banco".

### Tópico 3 — Comportamento Retroativo vs Histórico de Snapshots Fechados:
- **Cenário:** Uma conciliação de ontem (24/08) foi fechada (`is_closed = true`) com A Receber de R$ 11.814,50. Hoje (25/08), um título de R$ 300,00 é baixado.
- **Questão:** Como garantir que a baixa de hoje **não altere** o saldo histórico congelado de ontem?
  - A RPC deve avaliar `status = 'pendente' OR received_at > target_date` para dias anteriores, garantindo que o saldo histórico permaneça intacto.

### Tópico 4 — Experiência de Usuário (UX) na Substituição da Tela:
- A tela `/recebiveis` atual possui tabs e gráficos. A nova proposta substitui o miolo mantendo:
  1. **Header com Seletor de Data & Breadcrumb.**
  2. **4 KPIs Executivos.**
  3. **Grid das 10 Filiais** (cada card com cabeçalho da loja, total a receber da filial e tabela detalhada de títulos).
  4. **Modais de Criação Manual e Importação Excel.**

---

## 5. Resumo das Tarefas a Executar na Implementação

1. `[MIGRATION]` Adicionar `description`, `os_number`, `installment` e `matched_ofx_id` em `receivables`.
2. `[PARSER]` Criar `recebiveisParser.ts` para processar a aba `RECEBIVEIS ` de `CONCILIAÇÃO *.xlsx`.
3. `[HOOKS]` Implementar `useRecebiveis.ts` com agregação por loja e mutações.
4. `[COMPONENTS]` Criar `StoreReceivablesCard.tsx`, `ReceivableFormModal.tsx` e `ImportRecebiveisModal.tsx`.
5. `[PAGE]` Substituir `src/routes/recebiveis.tsx`.
6. `[INTEGRATION]` Vincular `ResumoDiaPanel.tsx` e `CentralImportWizard.tsx` para consumo automático do Pilar 3.
7. `[TEST & QA]` Validar importação real da planilha de 25/08 (R$ 11.814,50) e conciliação ponta a ponta.
