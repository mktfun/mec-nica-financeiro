## Análise de Implementação — Round 2 (Refutação Obrigatória) — [Engineer]

> **Council Debate:** Módulo de Recebíveis (Pilar 3) — Spec 284  
> **Data:** 25/08/2026 | **Round:** 2 — Refutação Obrigatória  
> **Autor:** Engenheiro de Software (Pragmático / Executor)  
> **Status:** Posicionamento Revisado & Plano de Execução Imediato  

---

### 1. Reações aos Claims do Round 1 (Refutação Mandatória)

---

#### [Contrarian] — Claim 1: "Ausência de UNIQUE CONSTRAINT / Chave de Deduplicação: Re-upload na Central de Importações duplica R$ 11.814,50 para R$ 23.629,00"

**→ (AGREE) — Crítico e indispensável, mas com implementação direta no PostgreSQL**

O Contrarian identificou a vulnerabilidade mais perigosa de execução: sem uma constraint física no banco, qualquer re-upload do arquivo `CONCILIAÇÃO 25.08.2026.xlsx` no [`CentralImportWizard.tsx`](file:///C:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/import/CentralImportWizard.tsx) insere linhas repetidas, dobrando o Pilar 3 e quebrando a conciliação diária.

**Implementação Pragmática (30 min):**
Não precisamos de regras complexas em memória no frontend. Resolvemos na raiz com um `UNIQUE INDEX` condicional e cláusula `ON CONFLICT` idempotente:

```sql
-- 1. Migration de Schema com Colunas Analíticas
ALTER TABLE public.receivables
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS os_number TEXT,
ADD COLUMN IF NOT EXISTS installment TEXT,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS interest_value NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS received_value NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS matched_ofx_id UUID REFERENCES public.ofx_transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Índice de Unicidade Natural para Deduplicação
CREATE UNIQUE INDEX IF NOT EXISTS idx_receivables_dedup 
ON public.receivables (
    store_id, 
    COALESCE(os_number, ''), 
    COALESCE(installment, ''), 
    COALESCE(description, ''), 
    due_date, 
    value
);
```

**Comportamento do Upsert no Parser/RPC:**
```sql
INSERT INTO public.receivables (
    store_id, store_name, type, description, os_number, installment, value, due_date, date, status
) VALUES (...)
ON CONFLICT (store_id, COALESCE(os_number, ''), COALESCE(installment, ''), COALESCE(description, ''), due_date, value)
DO UPDATE SET
    store_name = EXCLUDED.store_name,
    updated_at = now()
WHERE receivables.status = 'pendente'; -- Preserva títulos que o operador já baixou!
```
*Garantia:* Reimportar a planilha 10 vezes mantém exatamente os R$ 11.814,50 sem duplicar e sem reabrir títulos liquidados.

---

#### [Contrarian] & [Architect] — Claim 2: "Títulos Vencidos vs Status da Query: Títulos inadimplentes evaporam do cálculo se a query filtrar por `status = 'pendente'`"

**→ (AGREE com Architect) / (REFINE com Contrarian)**

O Contrarian levantou o temor de que o boleto Orion 1/3 (R$ 3.464,83, vencido em 24/08) sumiria do Pilar 3 se o sistema alterasse o status para `'vencido'`.  
O Architect propôs a solução canônica definitiva: **o status no banco NUNCA deve armazenar estados temporais** (`'vencido'` ou `'vence_hoje'`). O banco armazena estritamente o evento de negócio: `'pendente'`, `'recebido'`, `'cancelado'`.

**Implementação Pragmática no Código:**
1. **No Backend (RPC [`get_daily_reconciliation_summary`](file:///C:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260825000002_freeze_closed_snapshots_and_isolate_history.sql#L216-L702)):**
   Calculamos o Pilar 3 somando todos os títulos pendentes até a data de corte, com blindagem de timezone UTC-3:
   ```sql
   SELECT COALESCE(SUM(value), 0)
   INTO v_a_receber
   FROM public.receivables
   WHERE date <= v_target_date
     AND (
       status = 'pendente'
       OR (status = 'recebido' AND (received_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date)
     );
   ```
   *Resultado:* O boleto Orion de 24/08 continua com `status = 'pendente'`, portanto continua compondo os R$ 11.814,50 do dia 25/08 normalmente.
2. **No Frontend ([`StoreReceivablesCard.tsx`](file:///C:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/recebiveis/StoreReceivablesCard.tsx)):**
   Derivamos o badge visual em tempo de renderização (zero cron jobs, zero lag):
   ```typescript
   const isOverdue = item.status === 'pendente' && item.due_date < targetDate;
   const isDueToday = item.status === 'pendente' && item.due_date === targetDate;
   const isFuture = item.status === 'pendente' && item.due_date > targetDate;
   ```

---

#### [Contrarian] — Claim 3: "Pagamentos com Desconto/Juros ou Baixas Parciais inviabilizam o fechamento diário se o schema for simplista"

**→ (REFINE) — Problema real, mas resolvido com UX 80/20 sem inflar a complexidade**

O Contrarian argumenta que descompassos de centavos por desconto/juros ou pagamentos parciais forçam o operador a adulterar dados. Concordo com a necessidade contábil, mas rejeito construir um submódulo complexo de tesouraria que polua a tela.

**Solução Pragmática de Implementação (1h):**
* **Modal de Baixa Rápida:**
  * **Caso Padrão (95% dos casos):** Operador clica em `[Baixar Título]`. O modal abre com valor preenchido de `R$ 3.464,83` e botão primário `[Confirmar Baixa Integral (1 Clique)]`.
  * **Caso com Ajuste (5% dos casos):** Um link discreto `[+ Informar Desconto / Juros / Baixa Parcial]` expande 3 campos opcionais:
    - `Valor Pago (R$)` (default: valor original)
    - `Desconto (R$)`
    - `Juros / Multa (R$)`
  * **Se houver Baixa Parcial:** Ex: cliente pagou R$ 1.500 de R$ 3.464,83. O backend liquida o título atual (`received_value = 1500.00, status = 'recebido'`) e insere automaticamente a parcela residual (`value = 1964.83, status = 'pendente', os_number = '22529-SALDO'`).
* **Impacto Contábil:** A equação patrimonial bate no centavo, sem atrito para o fluxo rápido do operador.

---

#### [Architect] & [Analyst] — Claim: "Vínculo `matched_ofx_id` com categorização `receivable_settlement` e Redução de Latência (<2% com Match Assistido)"

**→ (AGREE) — Arquitetura sólida com excelente ROI de engenharia**

O Analyst provou que a baixa cega puramente manual tem latência de 42% (>24h de atraso), gerando divergências temporárias no fechamento. O Architect propôs o vínculo contábil `matched_ofx_id` para evitar faturamento duplicado.

**Implementação Pragmática (1.5h):**
Na tela [`StoreReceivablesCard.tsx`](file:///C:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/recebiveis/StoreReceivablesCard.tsx), quando a lista de OFX do dia contiver crédito compatível com a filial e valor do título (`abs(ofx.amount - rec.value) < 0.05`), exibimos a tag inteligente:
`💡 Crédito Itaú detectado: R$ 3.464,83 em 25/08 — [Vincular & Baixar]`  
Ao clicar:
1. Grava `receivables.status = 'recebido'`, `receivables.matched_ofx_id = ofx.id`.
2. Marca `ofx_transactions.manual_category = 'receivable_settlement'`.
3. A RPC não conta esse crédito como receita operacional nova, preservando a igualdade das partidas dobradas ($\Delta \text{Patrimônio} = 0$).

---

### 2. O que é Fácil de Implementar AGORA

| Item de Implementação | Arquivos Impactados | Esforço Est. | Nível de Complexidade |
| :--- | :--- | :---: | :---: |
| **1. Migration SQL de Schema & Deduplicação** | `supabase/migrations/20260825000003_receivables_schema_and_rpc.sql` | 30 min | 🟢 Baixa |
| **2. Parser Excel Tolerante (`recebiveisParser.ts`)** | `src/lib/parsers/recebiveisParser.ts` | 2h | 🟢 Baixa |
| **3. Integração com Central Import Wizard** | `src/components/import/CentralImportWizard.tsx` | 45 min | 🟢 Baixa |
| **4. Hook React Query (`useRecebiveis.ts`)** | `src/hooks/useRecebiveis.ts` | 45 min | 🟢 Baixa |
| **5. Card por Filial (`StoreReceivablesCard.tsx`)** | `src/components/recebiveis/StoreReceivablesCard.tsx` | 2h | 🟡 Média |
| **6. Cockpit de Recebíveis (`/recebiveis`)** | `src/routes/recebiveis.tsx` | 1h | 🟢 Baixa |
| **7. Drill-Down Modal no Resumo do Dia** | `src/components/conciliacao/RecebiveisDetailModal.tsx` | 1h | 🟢 Baixa |
| **Total de Engenharia:** | | **~8h 00min** | **1 dia de sprint** |

---

### 3. Riscos de Regressão e Estratégia de Blindagem

1. **Risco de Quebra de Snapshots Históricos Fechados:**
   - *Mitigação:* A migration [`20260825000002_freeze_closed_snapshots_and_isolate_history.sql`](file:///C:/Users/admin/.gemini/antigravity/scratch/financeiro/supabase/migrations/20260825000002_freeze_closed_snapshots_and_isolate_history.sql#L260-L371) já isolou o Ramal 1 (`is_closed = true`). Consultas a 17, 18, 19, 21 e 24/08 consomem a fotografia congelada sem tocar na tabela `receivables`. Risco de regressão histórica: **ZERO**.
2. **Risco de Falsos Positivos no Auto-Match:**
   - *Mitigação:* **Rejeição estrita de auto-match automático em background.** O match é 100% assistido (sugestão visual na UI) com confirmação deliberada do operador.
3. **Risco de Timezone Drift (UTC vs BRT):**
   - *Mitigação:* Conversão obrigatória `(received_at AT TIME ZONE 'America/Sao_Paulo')::date` em todas as queries e RPCs.
4. **Risco de Falha na Leitura de Planilhas Antigas:**
   - *Mitigação:* Parser com regex flexível `/(recebiveis|a receber)/i` e mapeamento semântico de colunas com fallbacks defensivos.

---

### 4. Quick Wins (80% do Valor com 20% do Esforço)

```
[Quick Win #1] Migration + Unique Index Deduplicação (30 min) ➔ Elimina duplicatas de R$ 11.814,50
      │
[Quick Win #2] Parser 'recebiveisParser.ts' (2h) ➔ Carga automática das 10 filiais da planilha
      │
[Quick Win #3] Card por Filial + Baixa Manual 1-Clique (2h) ➔ Operação autônoma dos gerentes
      │
[Quick Win #4] Drill-down Modal no Resumo do Dia (1h) ➔ Auditabilidade imediata do Pilar 3
      │
[Quick Win #5] Match Assistido com OFX Itaú (1.5h) ➔ Latência de baixa cai de 42% para <2%
```

---

### 5. Recomendação Final

**Veredicto:** **GO**  
**Confiança:** **0.96**  

**Justificativa:**  
Todas as objeções técnicas levantadas pelo Contrarian (falta de chave de deduplicação, tratamento de títulos vencidos, descontos/juros e timezone) foram incorporadas e solucionadas com código limpo, de baixo acoplamento e sem sobrecarga arquitetural. A máquina de estados derivada (status persistido apenas como `pendente`/`recebido`/`cancelado`) combinada com a `UNIQUE CONSTRAINT` física e o modelo de baixa assistida em 1 clique resolve a integridade contábil do Pilar 3 com esforço total de apenas 8 horas de desenvolvimento e risco nulo de regressão nos snapshots históricos já homologados.
