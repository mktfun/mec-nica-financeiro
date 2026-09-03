# Proposal: Fluxo Visual Limpo por Etapas e Recalibração do Motor de Matching Rede x OS (365)

## Problema

O operador relatou duas dores graves que tornaram a experiência do Fechamento Manual confusa e ineficiente:

1. **Poluição Visual Permanente dos Dropzones nas 4 Etapas:**
   > *"o input ele fica msm dps de eu importar, eu queria so ter o card do inut normal sem nada na tela e dps de eu importar aparcer os bglh la e suir o input... dai o msm pra cada etapa"*
   - Atualmente, em todas as 4 fases (`Fase1PatioOsReview`, `Fase2RedeVsOsReview`, `Fase3OfxReconciliation`, `Fase4ContasVsSaidasReview`), o card de Dropzone fica fixo ocupando 200px no topo da tela o tempo todo, mesmo após os arquivos já terem sido importados e processados.
   - Antes da importação, a tela já carrega cheia de ruído: barras de KPIs zerados (`R$ 0,00`) e tabelas/grids vazios (`"0 ordens de serviço"`, `"Nenhuma venda casada"`), em vez de apresentar um fluxo focado e limpo.

2. **Regressão no Motor de Matching Rede x OS (Fase 2):**
   > *"e tbm pra cada etapa o match parece que desevoluiu, pq n ta funcionando na maioria das os x rede, mais da metade sem vinculo real... e ai vai indo saca?"*
   - A RPC `match_stage2_rede_os` (criada nas migrations 27/28) realizava uma busca de candidatos em `patio_os` **sem qualquer filtro temporal na OS** (`WHERE store_id = v_pos.store_id`).
   - Toda a base histórica de OSs da oficina (meses ou anos) era consultada. Como valores de oficina são recorrentes (ex: R$ 50, R$ 120, R$ 150, R$ 200, R$ 350), qualquer venda de R$ 150 encontrava múltiplos candidatos históricos (`candidates_count > 1`).
   - A guarda de unicidade tratava isso cegamente como colisão (`collision`), impedindo o match automático de mais da metade das vendas legítimas do dia.
   - Além disso, a RPC não excluía OSs já pareadas (`match_status <> 'MATCHED'`) e havia removido o suporte a `credit_debit_value`.

---

## Solução Proposta (Foco em Reuso e Correção)

### 1. Arquitetura de UI em 2 Estados (`Clean Drop State` vs `Review State`)
Para cada uma das 4 etapas (`Fase 1`, `Fase 2`, `Fase 3`, `Fase 4`):
- **Estado 1: Clean Drop State (`viewMode === 'drop'`):**
  - Exibido quando não há dados importados para a data ou quando o operador aciona reimportação.
  - Tela 100% limpa e focada: apenas cabeçalho minimalista da fase e o **Card Dropzone Centralizado e Amplo**.
  - **Zero** KPIs zerados poluindo a visão e **zero** tabelas vazias.
  - Se já houver dados no banco para a data, exibe link discreto: *"Já existem dados carregados. [Ver conferência]"*.
- **Estado 2: Review State (`viewMode === 'review'`):**
  - Acionado imediatamente após o usuário soltar os arquivos e o parse/gravação concluir (ou se a etapa já possuir dados consolidados ao abrir a tela).
  - O card Dropzone **desaparece completamente da tela**, liberando 100% da área útil.
  - O cabeçalho revela a **Barra de KPIs Totalizadores** e um botão de ação compacto: `[Reimportar / Trocar Arquivos]`, permitindo reabrir o dropzone a qualquer momento sem perder os dados.
  - Exibe o workspace completo de conferência (`PatioExcelStoreAccordion`, `SmartResolutionStrip`, grids de conferência de sobras e saldos).

### 2. Recalibração Definitiva da RPC `match_stage2_rede_os` (PostgreSQL)
Reescrita da função PL/pgSQL com **Heurística em Cascata de 3 Tiers** e janela temporal estrita:
- **Janela de Elegibilidade Estrita:** Apenas OSs da data contábil alvo (`opened_at::date = p_target_date` ou `last_payment_date = p_target_date` ou `closed_at::date = p_target_date`) OU passivo em aberto recente (≤ 60 dias com saldo > 0). Ignora registros com `os_number ILIKE '%faturamento%'`.
- **Exclusão de OSs já Pareadas:** Filtra `match_status <> 'MATCHED'` e mantém lista negra em memória (`v_matched_os_ids`) para que uma OS casada na transação A não colida com a transação B do mesmo dia.
- **Suporte a Todos os Campos:** `credit_value`, `debit_value`, `credit_debit_value`, `total_value - paid_value` e `total_value` (tanto bruto quanto líquido).
- **Cascata em 3 Tiers:**
  - **Tier 1 (Cartão Específico):** Bate diretamente com `credit_value`, `debit_value` ou `credit_debit_value`.
  - **Tier 2 (Saldo Pendente):** Se não achou no Tier 1, bate com `total_value - paid_value`.
  - **Tier 3 (Total do Dia):** Se não achou no Tier 2, bate com `total_value` estritamente em OSs da data alvo.
- **Desempate Determinístico:** Se houver candidatos múltiplos no tier:
  1. Prevalecem candidatos abertos na data alvo.
  2. Se houver mais de um na data alvo, desempata por proximidade temporal de horário (`v_pos.occurred_at` vs `opened_at`).
  3. Se persistir colisão idêntica do mesmo dia, registra a colisão **apenas com os candidatos legítimos do dia** na `SmartResolutionStrip`.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes:**
  - `public.match_stage2_rede_os`: Reutilizada e substituída via `CREATE OR REPLACE FUNCTION` com a heurística calibrada em cascata.
  - `public.pos_transactions` e `public.patio_os`: Nenhuma nova coluna ou tabela criada. 100% de reuso dos campos existentes.
- **Componentes React Existentes:**
  - `Fase1PatioOsReview.tsx`, `Fase2RedeVsOsReview.tsx`, `Fase3OfxReconciliation.tsx`, `Fase4ContasVsSaidasReview.tsx`: Modificados com o padrão `viewMode: 'drop' | 'review'` sem criar componentes novos redundantes.
  - `PatioExcelStoreAccordion.tsx`, `SmartResolutionStrip.tsx`: 100% reutilizados no modo Review.

---

## Contratos de Dados & SQL (Supabase)

### RPC `match_stage2_rede_os(p_target_date date, p_store_id text)`
- **Parâmetros:** `p_target_date DATE` (obrigatório), `p_store_id TEXT DEFAULT NULL` (opcional).
- **Retorno:** `JSONB` estritamente compatível com o frontend (`success`, `matched_count`, `collisions_count`, `collisions`, `unmatched_pos_count`, `unmatched_os_cards_count`, `totals`).

---

## Risco Principal e Mitigação

- **Risco Principal:** Ocultar o dropzone e impedir o operador de adicionar arquivos complementares de outras filiais.
- **Mitigação:** No modo Review, sempre fornecer no cabeçalho um botão de destaque `[Reimportar / Trocar Arquivos]` que permite alternar imediatamente para o modo Dropzone, preservando deduplicação idempotente (`ignoreDuplicates: true`).
