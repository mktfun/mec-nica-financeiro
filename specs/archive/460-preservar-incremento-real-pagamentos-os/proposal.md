# Proposal: Preservar o Incremento Real dos Pagamentos da OS (Spec 460)

## Problema

1. **Perda da Linha de Base em Reimportações e Apuração de Deltas Zerados:**
   - O método `savePatioOsAndReceivables` (`src/hooks/useImportProcessor.ts`) utilizava o próprio pátio como base quando a observação não existia ou em reimportações subsequentes. Como o pátio já havia recebido o valor acumulado em gravação prévia (ex.: 2.727), `creditBefore` era lido como 2.727, resultando em `delta_credit = 0.00`.
   - Em 30/09/2026, todas as 403 observações de OSs foram gravadas com `delta_credit = 0` e `delta_debit = 0`. Havendo 13 vendas da Rede no dia, nenhuma pôde ser vinculada automaticamente.
   - Caso comprovado em Mauá (MHE), OS **22622 (Luan)**: o histórico de 30/09 às 12:17 UTC registra aumento de crédito de **400 para 2.727**. A maquininha Rede registrou venda de valor bruto **2.327** (líquido 2.207,39, NSU 171670498), batendo exatamente com o incremento real de 2.327. Porém, a observação gravada continha `before = 2.727 / after = 2.727 / delta = 0`, rejeitando o pareamento.
2. **Inversão e Falta de Atomicidade na Ingestão:**
   - O pátio (`patio_os`) era atualizado antes da gravação de `os_import_observations`. Falhas de rede ou no PostgREST deixavam o pátio alterado sem observação correspondente.
   - Erros de gravação de observações eram capturados com `console.warn` sem abortar a transação, mascarando a perda da linha de base.
3. **Concorrência Desordenada no CentralImportWizard:**
   - No `CentralImportWizard.tsx`, a esteira disparava `Promise.all` em paralelo para todos os arquivos de OS. Múltiplos arquivos da mesma filial concorriam entre si por leituras e atualizações do pátio e das observações.
4. **Inferência Falsa de Modalidade de Cartão no Parser:**
   - Em `useOsImportProcessor.ts` (L244), a ausência de modalidade identificada no texto da OS convertia cegamente o total da OS em `parsed_credit = totalValue || finalPaidValue`. Isso tornava OSs pagas por outros meios elegíveis indevidamente para matching de maquininhas Rede.
5. **Supressão de Deltas Negativos:**
   - O cálculo usava `Math.max(0, ...)`, apagando correções ou reduções legítimas de valor de OSs.

## Solução Proposta

1. **RPC Atômica de Ingestão de OSs (`record_os_import_batch`):**
   - Transação ACID no PostgreSQL (`SECURITY DEFINER`) que recebe o lote de OSs da filial para a data alvo.
   - Para cada OS:
     - Bloqueia e lê o registro atual em `patio_os`.
     - Verifica se já existe observação registrada nesta mesma data contábil (`target_date`) e filial (`store_id`): se existir, **preserva a primeira base original (`credit_before`, `debit_before`, `pix_before`, `paid_before`)**, recalculando o delta em relação a essa base inicial imutável do dia.
     - Se não existir observação no dia, utiliza o valor do pátio antes da mutação como base original.
     - Permite deltas negativos (correções contábeis) e registra a proveniência da base (`first_import`, `historical_log`, `existing_patio`).
     - Atualiza `patio_os`, grava o `history_log` e insere/atualiza `os_import_observations` no mesmo commit transacional. Se qualquer OS falhar, o lote inteiro da loja sofre rollback.
2. **Sequenciamento no CentralImportWizard:**
   - Processamento determinístico e sequencial por filial, garantindo que lotes da mesma loja sejam ingeridos sem race conditions.
3. **Remoção de Inferência Cega de Modalidade no Parser:**
   - Em `useOsImportProcessor.ts`, remover o fallback que convertia ausência de modalidade em crédito. Ordens sem meio de pagamento identificado mantêm `parsed_credit = 0`, tornando-se inelegíveis para auto-match de cartão até conferência humana.
4. **Proteção no Purge Diário (`purge_daily_financial_data`):**
   - Garantir que a restauração de pátio use backups capturados no início da primeira importação do dia, sem sobrescrever o pátio com snapshots tardios que já continham o acumulado.
5. **Saneamento Auditável de 30/09/2026:**
   - Reconstrução via migration do caso documentado da OS **22622 (Luan)** em Mauá (`store_id = '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f'`), restaurando `credit_before = 400.00`, `credit_after = 2727.00`, `delta_credit = 2327.00` e vinculando à transação Rede correspondente (NSU 171670498, bruto 2.327,00).
   - Para a OS 635 (Dom Pedro), ausente prova prévia inequívoca, mantê-la pendente com observação documentada.

## Skills Especializadas Aplicadas

- `database`: DDL da migration, RPC atômica `record_os_import_batch`, garantia de transacionalidade ACID, RLS para role `anon` e saneamento histórico de 30/09.
- `backend-patterns`: Integração determinística do hook `useImportProcessor.ts` com a RPC, tratamento de erro com interrupção estrita (zero silent fails).
- `frontend-design-pro`: Feedback visual claro no wizard de importação e consistência nos cards de revisão.
- `security`: Verificação de injeção SQL, parâmetros tipados e proteção de concorrência.

## Contratos de Dados

### Tabela `os_import_observations` (Evolução)
- `baseline_source TEXT DEFAULT 'first_import'`: registra se a base veio de `first_import`, `historical_log` ou `existing_patio`.
- `revision_count INT DEFAULT 1`: contador de reimportações sofridas no dia para a mesma OS.
- `is_negative_correction BOOLEAN DEFAULT false`: sinaliza se a alteração foi um estorno/redução.

### Nova RPC: `public.record_os_import_batch`
```sql
record_os_import_batch(
    p_store_id TEXT,
    p_target_date DATE,
    p_store_name TEXT,
    p_os_batch JSONB,
    p_receivables JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
```
Retorna resumo atômico: `{ "success": true, "inserted": n, "updated": m, "observations_recorded": k, "deltas": [...] }`.

## Arquivos Afetados

### [Arquivos Existentes Modificados]
1. `src/hooks/useImportProcessor.ts`: Roteamento da persistência de pátio e observações para a RPC atômica `record_os_import_batch`, remoção de gravações descompassadas e interrupção imediata em caso de erro.
2. `src/hooks/useOsImportProcessor.ts`: Remoção da atribuição cega de crédito (`parsed_credit = totalValue || finalPaidValue`) em linhas sem meio de pagamento identificado.
3. `src/components/importacoes/CentralImportWizard.tsx`: Sequenciamento estrito por filial na persistência de OSs para evitar condições de corrida.

### [Arquivos Novos]
1. `supabase/migrations/20261001000001_atomic_os_import_and_incremental_baseline.sql`:
   - Adiciona colunas de proveniência em `os_import_observations`.
   - Cria a RPC `record_os_import_batch` com tratamento transacional completo.
   - Saneamento pontual auditado para a OS 22622 (Luan) em 30/09/2026.
2. `tests/integration/os-payment-import-baseline.test.mjs`: Testes de integração cobrindo os cenários e provas de aceite exigidos.

## Evidência e Decisão

| Caminho:Símbolo | Ação | Motivo | Verificação |
|---|---|---|---|
| `useImportProcessor.ts:savePatioOsAndReceivables` | Editar | Centralizar a mutação na RPC atômica e impedir deltas zerados em reimportações. | Teste de reimportação mantém base anterior. |
| `useOsImportProcessor.ts:parseOsSpreadsheet` | Editar | Extirpar suposição arbitrária de crédito quando não há meio de pagamento declarado. | Arquivo sem modalidade gera `parsed_credit = 0`. |
| `CentralImportWizard.tsx:osPromises` | Editar | Sequenciar chamadas de persistência por filial em vez de `Promise.all` desordenado. | Ingestão em lote de mesma loja não colide. |
| `supabase/migrations/...`: RPC `record_os_import_batch` | Criar | Garantir transacionalidade ACID e imutabilidade da primeira linha de base do período. | Execução SQL e testes de regressão no PostgreSQL. |

## Plano de Rollback

1. **Database:** Migration reversível através de script correspondente que restaura a versão anterior da tabela/funções se necessário.
2. **Frontend:** Reverter os arquivos modificados em `src/hooks/` e `src/components/` mantendo compatibilidade com as tabelas existentes.
3. **Auditoria:** Todos os IDs e históricos de auditoria são estritamente preservados, sem purge global ou deleção destrutiva.

## Risco Principal e Mitigação

- **Risco:** Reimportações legítimas de correções de OSs terem sua nova versão bloqueada.
- **Mitigação:** A RPC recalcula o delta sempre em relação à primeira base válida do período (`credit_before`), atualizando `credit_after` para o novo valor importado. Dessa forma, uma correção de 400 → 2.727 gera delta 2.327; uma reimportação posterior com 2.800 gera delta 2.400 em relação à base 400, garantindo fidelidade contábil.
