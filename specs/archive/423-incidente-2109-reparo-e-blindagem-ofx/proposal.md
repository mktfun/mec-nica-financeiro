# Proposal — Incidente de 21/09: Causa Comprovada, Reparo no Banco Sem Perda de Dados e Blindagem da Janela OFX

## Problema
No lote de importação `a083037a-82a6-43fe-b634-361ec00f8954` gerado em 21/09/2026, os arquivos foram lidos e os dados foram gravados, mas em datas incompatíveis:
1. **Lote Partido em Duas Competências:**
   - Todos os 81 lançamentos OFX do lote foram gravados com `target_date = '2026-09-18'` (sexta-feira), totalizando R$ 49.304,69 de entradas e R$ 82.309,39 de saídas.
   - As 56 contas a pagar (R$ 73.509,19) e as 34 vendas de maquininha (R$ 53.773,95) foram gravadas com `target_date = '2026-09-21'` (segunda-feira).
   - Para `target_date = '2026-09-21'`, resultou em **zero lançamentos OFX**.
2. **Motores de Pareamento com Falso Sucesso:**
   - `auto_match_saidas('2026-09-21')` e `auto_match_daily_transactions('2026-09-21')` filtram estritamente `target_date = '2026-09-21'`. Encontrando 0 OFX, resultaram em 0 matches, deixando todas as saídas órfãs e contas a descoberto.
3. **Reconciliador Rede x OFX Descartou os Créditos:**
   - Em `CentralImportWizard.tsx` (linhas 2188-2191), a checagem `cleanDate === cleanTarget` filtrou estritamente `20260918 === 20260921`, descartando todos os créditos bancários e deixando 100% das vendas da Rede como "A COMPENSAR".
4. **Fechamento Prematuro com Dados Corrompidos:**
   - Foi gravado um fechamento em `daily_snapshots` com `is_closed = true`, faturamento de R$ 69.064,82, contas de R$ 73.509,19 e divergência artificial de R$ 18.069,08.

## Causa-Raiz Comprovada
Em `src/components/importacoes/CentralImportWizard.tsx` (linhas 1570-1573):
```typescript
const parsedTxDate = tx.date ? String(tx.date).split('T')[0] : targetDate;
const diffMs = Math.abs(new Date(targetDate + 'T12:00:00Z').getTime() - new Date(parsedTxDate + 'T12:00:00Z').getTime());
const isRecentClosingTx = !tx.date || diffMs <= 86400000;
const effectiveOfxDate = isRecentClosingTx ? targetDate : parsedTxDate;
```
O threshold de `86400000` ms (1 dia / 24h) ignora finais de semana (sexta para segunda são 3 dias = 259.200.000 ms) e feriados prolongados. Isso viola a diretriz de domínio registrada na memória Obsidian (`.agent/memory/ofx.md`, Spec 331), que determina que lançamentos de fim de semana importados para fechamento de segunda-feira devem receber a competência contábil `targetDate`.

## Solução Proposta

### 1. Blindagem de Código (`CentralImportWizard.tsx`)
- **Extensão da Janela de Fechamento de Fim de Semana / Feriado:**
  Substituir o threshold de 1 dia por uma janela retroativa de até 4 dias (`diffDays <= 4` ou `parsedTxDate <= targetDate && diffMs <= 4 * 86400000`). Transações bancárias contidas no lote de fechamento recebem `effectiveOfxDate = targetDate`, mantendo `occurred_at` com o timestamp real do extrato.
- **Harmonização do Reconciliador Rede x OFX:**
  Na linha 2190, permitir que os créditos do extrato associados ao lote sejam confrontados com as vendas da adquirente da mesma competência.

### 2. Saneamento e Reparo do Banco de Dados (Idempotente & Sem Perda de Dados)
Executar script de reparo forense:
1. Atualizar em `ofx_transactions` os 81 registros do lote `a083037a-82a6-43fe-b634-361ec00f8954` para `target_date = '2026-09-21'` (mantendo `occurred_at = '2026-09-18'`).
2. Executar as RPCs de reconciliação para `2026-09-21`:
   - `auto_match_saidas('2026-09-21')`
   - `auto_match_daily_transactions('2026-09-21')`
3. Atualizar a tabela `reconciliations` para `date = '2026-09-21'` refletindo `ofx_imported = true` e as entradas/saídas consolidadas de cada filial.
4. Recalcular e reabrir o snapshot diário em `daily_snapshots` para `date = '2026-09-21'`, sincronizando caixa atual, fluxo de caixa e valor disponível de contas.

## Skills Especializadas Aplicadas
- `database`: Operações atômicas no Supabase, RPCs de matching e integridade relacional.
- `backend-patterns`: Saneamento de regras de data, idempotência e tratamento transacional.
- `obsidian`: Respeito estrito às regras canônicas de `ofx.md` (Spec 331).

## Contratos de Dados Afetados
- `public.ofx_transactions`: `target_date` atualizado de `2026-09-18` para `2026-09-21` para o lote `a083037a-82a6-43fe-b634-361ec00f8954`.
- `public.reconciliations`: Sincronização de flags `ofx_imported` e agregação por loja.
- `public.daily_snapshots`: Recálculo de fechamento e ajuste de `is_closed`.

## Arquivos Afetados
### Arquivos Existentes Modificados
- `src/components/importacoes/CentralImportWizard.tsx`: Correção do cálculo de `isRecentClosingTx` e pareamento Rede x OFX.

### Scripts Transitórios de Reparo (.tmp/ e scratch/)
- `scratch/repair_2109_incident.cjs`: Script determinístico de saneamento e execução das RPCs.

## Plano de Rollback
- Caso o script de reparo apresente inconsistência, os 81 registros podem ser revertidos imediatamente para `target_date = '2026-09-18'` via rollback SQL filtrando pelo `import_batch_id = 'a083037a-82a6-43fe-b634-361ec00f8954'`.
- Backup prévio do estado das tabelas afetadas gravado em `.tmp/backup_2109_pre_repair.json` antes de qualquer mutação.

## Risco Principal e Mitigação
- **Risco:** Reabertura de reconciliações afetar snapshots históricos de 18/09.
- **Mitigação:** O snapshot de 18/09 já está blindado com `is_closed = true` e 159 OFX originais daquela data. O filtro do reparo é estritamente isolado pelo UUID do lote `a083037a-82a6-43fe-b634-361ec00f8954`, garantindo zero impacto em dados legítimos de 18/09.
