# Proposal: Eliminação Definitiva de Sobrecargas de RPC (PGRST203) e Restauração Integral do Painel (293)

## Problema
Ao acessar o painel de conciliação diária, o frontend exibe tela zerada devido a erros `PGRST203` do PostgREST:
```
PGRST203: Could not choose the best candidate function between:
public.get_daily_reconciliation_summary(p_date => date, p_force_dynamic => boolean),
public.get_daily_reconciliation_summary(p_date => text, p_force_dynamic => boolean)
```
e
```
PGRST203: Could not choose the best candidate function between:
public.get_store_pos_triple_reconciliation(p_target_date => text, p_date => text),
public.get_store_pos_triple_reconciliation(p_target_date => text)
```

### Causa Raiz:
No PostgreSQL, quando funções com o mesmo nome foram criadas com assinaturas de tipos diferentes (ex: `date` vs `text`, `uuid` vs `text`, ou quantidade diferente de parâmetros padrão), o PostgREST não consegue resolver a ambiguidade na camada de roteamento HTTP e recusa a requisição com código `PGRST203`.
A auditoria via catálogo do PostgreSQL (`pg_proc`) identificou 5 funções com sobrecargas conflitantes ativas no banco:
1. `get_daily_reconciliation_summary` (`date` vs `text`)
2. `get_store_pos_triple_reconciliation` (`date` vs `text, text`)
3. `get_raw_os_data` (`uuid` vs `text`)
4. `get_store_financial_stats` (`uuid` vs `text`)
5. `get_receivables_summary` (`void` vs `date`)

## Solução Proposta
1. **Limpeza e Desambiguação de 100% das RPCs no PostgreSQL:**
   - Executar `DROP FUNCTION` explícito com a lista completa de argumentos de todas as variantes antigas para expurgá-las do catálogo.
   - Recriar **uma única assinatura canônica** para cada função no schema `public`.
2. **Padrão Canônico de Assinaturas (PostgREST-Safe):**
   - `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)` (Aceita data formatada em texto e flag de recálculo dinâmico).
   - `get_store_pos_triple_reconciliation(p_target_date text)` (Aceita estritamente `p_target_date text`).
   - `get_raw_os_data(p_store_id text, p_date text)` (Padronizado para `text`).
   - `get_store_financial_stats(p_store_id text, p_start_date text, p_end_date text)` (Padronizado para `text`).
   - `get_receivables_summary(p_date text DEFAULT NULL)` (Padronizado para `text`).
3. **Validação da Chamada no Frontend:**
   - Garantir que `useBackendConciliacao.ts` passe estritamente os nomes de parâmetros corretos (`p_date` e `p_target_date`).
4. **Verificação Instantânea de 0 Erros PGRST203:**
   - Script de teste consultando diretamente o PostgREST para comprovar retorno 200/201 e dados populados sem ambiguidade.

## Contratos de Dados & Backend
- **Tabelas Envolvidas:** `reconciliations`, `daily_snapshots`, `pos_transactions`, `ofx_transactions`, `patio_os`.
- **RPCs Atualizadas:** 5 funções públicas unificadas.

## Risco Principal
- **Risco:** Alguma tela chamar uma RPC com parâmetro nomeado legado (ex: `p_date` em vez de `p_target_date` em `get_store_pos_triple_reconciliation`).
- **Mitigação:** Varredura em todo o código (`grep_search`) para garantir que todos os hooks usem a nomenclatura canônica.
