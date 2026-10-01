# Proposal: Unificar o Matcher Rede × OS, a Seleção Manual e o Diagnóstico (Spec 461)

## Problema

1. **Erro 42702 (`payment_method` is ambiguous) na RPC Canônica:**
   - A função `public.get_rede_os_eligible_candidates` retorna `TABLE (..., payment_method TEXT, ...)` e executa consultas internas como `SELECT id, store_id, target_date, gross_amount, payment_method FROM public.pos_transactions`. No PostgreSQL PL/pgSQL, a coluna `payment_method` na query colide diretamente com o parâmetro de saída da tabela retornada, provocando `ERROR: 42702: column reference "payment_method" is ambiguous`.
   - Como resultado, qualquer chamada à RPC (como ao abrir o modal para conciliar vendas de cartão) falha imediatamente no banco de dados.

2. **Falha de Detecção de Modalidades por Acentuação:**
   - O código SQL publicado verifica modalidades de cartão usando `LOWER(COALESCE(payment_method, '')) ILIKE '%cred%'` e `ILIKE '%deb%'`.
   - No PostgreSQL, strings reais como `"Cartão Crédito VISA"` ou `"Cartão Débito ELO"` contêm caracteres acentuados (`é`, `ê`). Testes comprovaram que `'Cartão Crédito VISA' ILIKE '%cred%'` retorna **`false`**, deixando `v_is_credit` e `v_is_debit` como `false/false`.
   - Isso joga a transação num ramo genérico/desconhecido, impedindo a correlação precisa de modalidades e fazendo com que `link_manual_rede_to_os` incremente `consumed_credit` e `consumed_debit` em R$ 0,00!

3. **Fallback Silencioso e Deceptivo no Hook `useManualMatch.ts`:**
   - Em `src/hooks/useManualMatch.ts` (L48), o erro da RPC `get_rede_os_eligible_candidates` é capturado apenas com `console.warn` e a execução prossegue silenciosamente para consultar a tabela bruta `patio_os`.
   - Ao consultar `patio_os`, os deltas da importação do dia são substituídos pelo saldo total acumulado da OS, desfazendo a base isolada por data da conciliação.

4. **"Match por Valor" Enganoso no Modal de Seleção Manual:**
   - Em `ManualMatchOsModal.tsx` (L613-625 e L720), quando `os.available_card_amount` é 0, o componente recorre em cascata a `credit_value`, `debit_value`, `saldoAberto` ou `totalVal`.
   - Ao comparar esse valor acumulado com o valor bruto da maquininha (`txAmount`), se coincidirem, o modal rotula a OS com um badge verde/azul brilhante de **"Match por Valor"** e estiliza a linha com borda esmeralda, induzindo o operador a vincular uma OS que não teve nenhuma alteração ou incremento de cartão no dia!

5. **Conflito de Concorrência e Sessão em Tabelas Temporárias:**
   - A criação de tabelas temporárias (`CREATE TEMP TABLE temp_candidates ON COMMIT DROP`) no corpo de funções chamadas repetidamente na mesma sessão ou transação gera colisões de relação existente (`relation "temp_candidates" already exists`).

6. **Falta de Unicidade Bidirecional (Anti-Collision 1:1):**
   - O motor `match_stage2_rede_os` itera sobre as transações POS por ordem decrescente de valor bruto. Se houver duas vendas idênticas de R$ 100,00 da mesma filial disputando uma única OS com delta de R$ 100,00, a primeira transação ganha a OS pelo critério arbitrário da iteração, e a segunda é classificada como órfã esgotada. Isso é uma colisão real que deve exigir arbitragem humana em ambos os lados.

7. **Divergência Crítica no Motor em Memória (`autoMatchingEngine.ts`):**
   - Em `src/lib/matchers/autoMatchingEngine.ts` (L289 e L327), o motor em memória calcula `osCardVal = credit + debit` somando indiscriminadamente crédito e débito, e possui um Tier 3 que aceita `paid_value` ou `total_value` como candidato de cartão. O preview gerado diverge do comportamento real do banco.

8. **Inconsistência de Contratos de Resposta e Supressão de Erros:**
   - A RPC `auto_match_daily_transactions` retorna `pos_matched` e `pix_matched`, enquanto o assistente de importação (`CentralImportWizard.tsx`) lê `matched_pos_count` e `matched_pix_count`.
   - Além disso, exceções na etapa Rede dentro de `auto_match_daily_transactions` são capturadas com `EXCEPTION WHEN OTHERS THEN v_pos_matched := 0;`, registrando no log que "nenhuma nova OS foi casada", em vez de reportar o erro real de execução SQL.

---

## Solução Proposta

1. **Migration Canônica de Alinhamento e Blindagem SQL (`20261001000002_unify_rede_os_matcher_and_diagnostics.sql`):**
   - **Qualificação Integral:** Qualificar explicitamente todas as referências de colunas (`pt.payment_method`, `obs.os_number`, `p.credit_value`, etc.) em `get_rede_os_eligible_candidates`, `match_stage2_rede_os`, `link_manual_rede_to_os` e `unlink_manual_os_match`.
   - **Remoção de Tabelas Temporárias:** Substituir `CREATE TEMP TABLE` por Expressões de Tabela Comuns (CTEs `WITH candidates AS (...) SELECT ...`), garantindo execução concorrente e idempotente sem bloqueios de catálogo nem conflitos de sessão.
   - **Normalização Robusta de Acentos:** Utilizar `TRANSLATE(LOWER(...), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc')` para classificar modalidades de cartão (`cred` e `deb`) de forma à prova de variações ortográficas ("Cartão Crédito VISA", "Cartão Débito ELO", "Crédito à Vista", etc.).
   - **Modalidade Desconhecida:** Caso uma transação não seja categorizada como débito nem crédito, categorizar como `unrecognized_modality`, bloqueando o auto-match e encaminhando obrigatoriamente para revisão.
   - **Unicidade Bidirecional (1:1):** No `match_stage2_rede_os`, identificar ambiguidades antes da mutação. Se múltiplas transações POS da mesma filial disputarem o mesmo valor de delta de uma OS (ou se múltiplas OSs tiverem o mesmo delta para uma única venda), marcar ambos os lados como `collision`.
   - **Enriquecimento Diagnóstico em `get_rede_os_eligible_candidates`:** Retornar colunas de linha de base e consumo: `credit_before`, `credit_after`, `consumed_credit`, `debit_before`, `debit_after`, `consumed_debit`, além de `available_card_amount`, `candidate_status` e `reason_code`.
   - **Consumo e Desvinculação Acurados:** Corrigir `link_manual_rede_to_os` e `unlink_manual_os_match` para incrementar e estornar `consumed_credit` e `consumed_debit` com a mesma regra de normalização de acentos.

2. **Alinhamento do Motor em Memória (`autoMatchingEngine.ts`):**
   - Eliminar a soma cega `osCardVal = credit + debit`.
   - Avaliar modalidade estrita (se POS é crédito, compara com `parsed_credit`; se débito, com `parsed_debit`).
   - Remover o fallback de Tier 3 por `paid_value` e `total_value`.
   - Aplicar verificação de colisão nos dois lados para manter o preview fiel ao banco.

3. **Eliminação de Fallbacks Deceptivos e UI Transparente:**
   - **`useManualMatch.ts`:** Propagar erros da RPC com `throw new Error(...)` para que o TanStack Query entre em estado `isError`, sem nunca recorrer silenciosamente a `patio_os`.
   - **`ManualMatchOsModal.tsx`:**
     - Se `available_card_amount === 0`, o valor exibido permanece zero. Zero inferência para `saldoAberto` ou `totalVal`.
     - Eliminar o badge ilusório "Match por Valor" e as cores esmeralda/azul para OSs sem delta disponível.
     - Exibir seção de diagnóstico estruturada: `Base Anterior`, `Acumulado Atual`, `Incremento Importado`, `Valor Consumido` e `Disponível`.
     - Vínculo manual de OS com disponível zero torna-se ação excepcional explícita com confirmação auditada.
     - Exibir banner de erro recuperável com botão "Tentar Novamente" quando a RPC falhar.

4. **Harmonização de Contratos e Observabilidade:**
   - `auto_match_daily_transactions` passa a retornar tanto `matched_pos_count` quanto `pos_matched`, e tanto `matched_pix_count` quanto `pix_matched`.
   - Erros em `match_stage2_rede_os` dentro de `auto_match_daily_transactions` são capturados com `SQLERRM` e retornados em `stage2_error`, sendo reportados no log do `CentralImportWizard.tsx` como alertas reais em vez de "Nenhuma nova OS casada".

---

## Skills Especializadas Aplicadas

- `database`: Resolução do erro 42702, migração de temp tables para CTEs, garantia de unicidade 1:1 com detecção bidirecional, normalização de caracteres semântica via `TRANSLATE` e atomicidade em `SECURITY DEFINER`.
- `backend-patterns`: Sincronização determinística entre o motor de pré-visualização TypeScript e os stored procedures PostgreSQL, tratamento tipado de respostas de RPC e eliminação de falhas silenciosas.
- `frontend-design-pro`: Padrões do Dark UI Zinc-950, eliminação de falsos indicadores positivos ("AI Slop"), exibição hierárquica e honesta de dados contábeis (base, incremento, consumo, saldo disponível).
- `security`: Verificação de injeção SQL, chamadas RPC parametrizadas com sanitização de tipos, RLS preservada e auditoria de ações excepcionais.

---

## Contratos de Dados

### Nova Assinatura de `public.get_rede_os_eligible_candidates`

```sql
CREATE OR REPLACE FUNCTION public.get_rede_os_eligible_candidates(
    p_pos_id UUID,
    p_include_historical BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    os_number TEXT,
    client_name TEXT,
    plate TEXT,
    candidate_status TEXT,
    reason_code TEXT,
    credit_before NUMERIC,
    credit_after NUMERIC,
    consumed_credit NUMERIC,
    delta_credit NUMERIC,
    debit_before NUMERIC,
    debit_after NUMERIC,
    consumed_debit NUMERIC,
    delta_debit NUMERIC,
    available_card_amount NUMERIC,
    pos_gross_amount NUMERIC,
    total_value NUMERIC,
    paid_value NUMERIC,
    open_balance NUMERIC,
    payment_method TEXT,
    observed_at TEXT
)
```

### Contrato de Retorno de `public.auto_match_daily_transactions`

```json
{
  "success": true,
  "date": "2026-09-30",
  "pos_matched": 1,
  "matched_pos_count": 1,
  "pix_matched": 0,
  "matched_pix_count": 0,
  "collisions_prevented": 0,
  "stage2_error": null,
  "diagnostics": [
    {
      "step": "rede_stage2",
      "pos_id": "c572e5ed-1595-4354-9e92-febfabc540c3",
      "os_number": "22622",
      "gross_amount": 2327.00,
      "modality": "credito",
      "decision": "matched",
      "reason": "Delta de crédito 100% aderente"
    }
  ]
}
```

---

## Arquivos Afetados

### [Arquivos Novos]
1. `supabase/migrations/20261001000002_unify_rede_os_matcher_and_diagnostics.sql`: DDL canônico contendo as 5 funções corrigidas (`get_rede_os_eligible_candidates`, `match_stage2_rede_os`, `auto_match_daily_transactions`, `link_manual_rede_to_os`, `unlink_manual_os_match`).
2. `tests/integration/matcher-rede-os-diagnostics.test.mjs`: Testes automatizados cobrindo a execução da RPC, normalização de acentos, detecção de colisão bidirecional e contratos de resposta.

### [Arquivos Existentes Modificados]
1. `src/hooks/useManualMatch.ts`: Remoção do fallback silencioso para `patio_os`, enriquecimento da interface `StoreOsCandidate` e propagação de erro para TanStack Query.
2. `src/components/conciliacao/ManualMatchOsModal.tsx`: Eliminação do falso "Match por Valor", remoção de fallback de disponível zero para saldos acumulados, renderização do painel diagnóstico e confirmação explícita para ações manuais sem delta.
3. `src/lib/matchers/autoMatchingEngine.ts`: Separação estrita de modalidades em Tier 1, remoção de fallback por saldo/total em Tier 3 e validação de ambiguidade bidirecional.
4. `src/components/importacoes/CentralImportWizard.tsx`: Leitura compatibilizada de chaves (`pos_matched` / `matched_pos_count`) e exibição de erro da etapa caso presente em `stage2_error`.
5. `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx`: Alinhamento com a nova assinatura e exibição aprimorada de amostras diagnósticas.

---

## Evidência e Decisão

| Artefato Afetado | Símbolo / Trecho | Decisão | Motivo | Verificação |
|---|---|---|---|---|
| `supabase/migrations/` | `get_rede_os_eligible_candidates` | **Editar via nova migration** | Erro 42702 comprovado ao vivo no banco de dados e falha com acentos em `ILIKE`. | Consulta SQL retorna linhas sem erro 42702. |
| `supabase/migrations/` | `match_stage2_rede_os` | **Editar via nova migration** | Eliminar temp tables, tratar acentos e garantir unicidade bidirecional (1:1). | Simulação de 2 POS x 1 OS resulta em `collision`. |
| `supabase/migrations/` | `auto_match_daily_transactions` | **Editar via nova migration** | Unificar chaves de contagem e propagar erros sem silenciamento. | Retorna `matched_pos_count` e `stage2_error`. |
| `src/hooks/useManualMatch.ts` | L41-76 | **Editar** | Eliminar fallback silencioso que lia `patio_os` com acumulado em vez de delta. | Falha da RPC transita hook para `isError: true`. |
| `src/components/conciliacao/ManualMatchOsModal.tsx` | L613-625, L720 | **Editar** | Eliminar badge "Match por Valor" que enganava o operador com valores de saldo ou total. | OS com disponível zero mostra `R$ 0,00` sem badge verde. |
| `src/lib/matchers/autoMatchingEngine.ts` | L284-338 | **Editar** | Eliminar `osCardVal = credit + debit` e fallback de Tier 3 para total da OS. | Preview em memória replica fielmente o banco. |
| `src/components/importacoes/CentralImportWizard.tsx` | L2308-2315 | **Editar** | Ler `posCount` tanto de `matched_pos_count` quanto de `pos_matched` e reportar erros. | Contagem de matches aparece correta no log da esteira. |

---

## Plano de Rollback

1. **Reversão de Banco:** Executar o script DDL da migration anterior `20260929000004_canonical_rede_os_matcher.sql`, restaurando as definições anteriores das funções.
2. **Reversão de Código:** `git checkout HEAD -- src/hooks/useManualMatch.ts src/components/conciliacao/ManualMatchOsModal.tsx src/lib/matchers/autoMatchingEngine.ts src/components/importacoes/CentralImportWizard.tsx src/components/importacoes/manual/Fase2RedeVsOsReview.tsx`.
3. **Integridade de Dados:** Nenhuma tabela foi alterada estruturalmente; apenas funções PL/pgSQL foram aprimoradas. Reversão instantânea sem impacto em dados existentes.

---

## Risco Principal e Mitigação

- **Risco:** Algum componente de conciliação manual esperar que `get_rede_os_eligible_candidates` traga a lista inteira do pátio quando não houver observações de importação gravadas.
- **Mitigação:** A RPC mantém o parâmetro `p_include_historical BOOLEAN DEFAULT FALSE`. Quando ativado pelo usuário ("Buscar em Todo o Histórico"), as OSs antigas sem movimentação no dia são categorizadas explicitamente como `historical_no_delta`, com `available_card_amount = 0`, evitando qualquer falsa elegibilidade automática.
