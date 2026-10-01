# Proposal 3 — Corrigir a Seleção de Saldo OFX e Impedir Sucesso Falso (Spec 462)

## 1. Problema Diagnosticado

Durante a importação centralizada (`/importacoes`), ao selecionar a fonte de saldo oficial do extrato OFX e marcar para salvar a preferência (regra duradoura), a operação de persistência falha sistematicamente no banco de dados com a seguinte exceção SQL:
```text
42703 — column "updated_at" of relation "reconciliations" does not exist
```

### Evidências Confirmadas:
1. **Schema Real do Banco de Dados:** A tabela `public.reconciliations` possui as colunas `created_at` e `processed_at`, mas **não possui** a coluna `updated_at`. Por outro lado, `public.daily_snapshots` possui `updated_at`.
2. **Defeito na RPC Publicada:** A função `public.apply_ofx_balance_selection` (introduzida na migration `20260927000001_ofx_balance_candidates_and_rules.sql:438`) executa:
   ```sql
   INSERT INTO public.reconciliations (store_id, date, bank_total, updated_at)
   VALUES (r.store_id, p_target_date, r.total_bank, now())
   ON CONFLICT (store_id, date) DO UPDATE
   SET bank_total = EXCLUDED.bank_total,
       updated_at = now();
   ```
   Como a coluna `updated_at` não existe na tabela `reconciliations`, o PostgreSQL aborta a transação inteira atomicamente, revertendo o registro em `ofx_balance_selections`, a regra em `ofx_balance_rules` e os eventos de auditoria.
3. **Engolimento Silencioso no Frontend (Falso Sucesso):** Em `src/components/importacoes/CentralImportWizard.tsx:2104`, a chamada `applyOfxBalanceSelection` é capturada por um bloco `try / catch` que apenas emite `console.warn`. O fluxo prossegue normalmente até o Step 8 e registra a mensagem enganosa:
   ```text
   addLog("✅ TODAS AS ETAPAS FORAM CONCLUÍDAS COM SUCESSO!", "success");
   ```
   O usuário acredita que o saldo e a regra foram salvos, mas ao recarregar a tela ou abrir nova conciliação, o sistema pede novamente a escolha do saldo.
4. **Falta de Idempotência e Repetição Isolada:** Não existe mecanismo para repetir unicamente a persistência do saldo OFX sem ter que reimportar os arquivos de OS e Rede ou arriscar duplicar regras e eventos de auditoria.

---

## 2. Solução Proposta

1. **Nova Migration Corretiva DDL:**
   - Criar `supabase/migrations/20261001000003_fix_apply_ofx_balance_selection_and_idempotency.sql`.
   - Substituir a função `public.apply_ofx_balance_selection`:
     - Retirar `updated_at` estritamente do `INSERT` e `ON CONFLICT DO UPDATE` da tabela `public.reconciliations`.
     - Preservar a gravação de `updated_at` nas tabelas que a possuem (`daily_snapshots`, `ofx_balance_candidates`, `ofx_balance_rules`, `ofx_balance_selections`).
     - Tornar a criação de regras e eventos **estritamente idempotente**: se já existir uma regra ativa com o mesmo `account_key`, `source_kind`, `memo_normalized` e `store_id`, não incrementar desnecessariamente a versão nem gerar duplicidade. Não registrar evento redundante se a seleção anterior for idêntica.
     - Garantir soma correta de múltiplas contas na mesma filial (`GROUP BY store_id`) contemplando saldos positivos, negativos e zero.
2. **Camada de Hook & Frontend:**
   - Atualizar `src/hooks/useOfxBalanceMappings.ts` garantindo tipagem clara e feedback visual do estado de salvamento.
   - Atualizar `src/components/importacoes/CentralImportWizard.tsx`:
     - Interromper a proclamação de sucesso falso caso `applyOfxBalanceSelection` lance erro.
     - Marcar a etapa do agente (`importStages[2]` - OFX) com status `'error'` e registrar código, mensagem, data e contas afetadas.
     - Incluir o erro detalhado no payload do JSON de Auditoria (`auditData.ofxBalanceSelectionError`).
     - No Step 8, exibir alerta âmbar/rose com botão de ação dedicado: **"Repetir Aplicação de Saldo OFX"**.
     - O retry executa exclusivamente a RPC `applyOfxBalanceSelection` para o payload retido, sem reimportar arquivos nem duplicar vínculos de OS ou despesas.
     - Após o sucesso do retry ou da aplicação inicial, invalidar caches e comparar os valores exibidos com os dados persistidos no backend.

---

## 3. Skills Especializadas Aplicadas

- **`database`**: DDL idempotente, resolução de colunas Postgres, RLS seguro e agregação matemática estrita por filial.
- **`backend-patterns`**: Contratos RPC resilientes, tratamento transacional, idempotência de regras e auditoria append-only.
- **`frontend-design-pro`**: Tratamento de erro transparente, eliminação de falsos sucessos, botões de ação e alertas alinhados aos tokens Shadcn Zinc-950 (`bg-card`, `border-border`, etc.).
- **`security`**: Manutenção das restrições de permissão `SECURITY DEFINER` e salvaguarda para dias com fechamento selado.

---

## 4. Contratos de Dados

### 4.1 RPC `apply_ofx_balance_selection`
```sql
CREATE OR REPLACE FUNCTION public.apply_ofx_balance_selection(
  p_selections jsonb,
  p_target_date date,
  p_user_id text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
```
- **Assinatura mantida 100% retrocompatível** com o frontend existente.
- **Retorno JSONB:**
  ```json
  {
    "success": true,
    "target_date": "2026-09-30",
    "affected_stores": ["maua", "santo_andre"],
    "was_closed": false
  }
  ```

---

## 5. Arquivos Afetados & Mapeamento de Blast Radius

### [Arquivos Novos]
1. `supabase/migrations/20261001000003_fix_apply_ofx_balance_selection_and_idempotency.sql`:
   - *Decisão:* Criar nova migration (não alterar a anterior já aplicada).
   - *Motivo:* Substituição limpa e determinística da RPC `apply_ofx_balance_selection`.
2. `tests/integration/ofx-balance-selection.test.mjs`:
   - *Decisão:* Criar suíte de testes de integração cobrindo a RPC e os cenários de erro/retry.
3. `tests/unit/import-stage-outcome.test.mjs`:
   - *Decisão:* Criar teste unitário para garantir que falhas em etapas secundárias do Wizard bloqueiam o selo de sucesso integral.

### [Arquivos Existentes Modificados]
1. `src/components/importacoes/CentralImportWizard.tsx`:
   - *caminho:símbolo/trecho:* L2103-2115 (chamada `applyOfxBalanceSelection`), L2598 (log de conclusão), L4300-4420 (Hero Banner e botões de ação no Step 8).
   - *Decisão:* Editar cirurgicamente.
   - *Motivo:* Capturar erro, marcar estágio como `'error'`, impedir anúncio de sucesso falso e disponibilizar retry isolado.
2. `src/hooks/useOfxBalanceMappings.ts`:
   - *caminho:símbolo/trecho:* `applyMutation`.
   - *Decisão:* Editar cirurgicamente.
   - *Motivo:* Garantir revalidação adequada e contrato de retorno explícito.

---

## 6. Plano de Rollback

1. **Reversão de Banco:** A migration anterior `20260927000001_ofx_balance_candidates_and_rules.sql` contém a versão anterior da função (embora defeituosa em relação a `updated_at`). Caso necessário, a função pode ser recriada a partir do commit base.
2. **Reversão de Código Frontend:** Como as edições em `CentralImportWizard.tsx` e `useOfxBalanceMappings.ts` são cirúrgicas, um `git checkout` pontual dos dois arquivos restaura o estado imediatamente sem afetar outros módulos.
3. **Preservação de Dados:** A correção do SQL remove uma coluna inexistente; nenhuma coluna ou dado existente é deletado ou alterado de tipo.

---

## 7. Risco Principal e Mitigação

- **Risco:** Re-execução da RPC durante o retry acumular versões duplicadas em `ofx_balance_rules` ou registros duplicados em `ofx_balance_selection_events`.
- **Mitigação:** Implementar checagem prévia de existência de regra idêntica ativa antes do `INSERT INTO ofx_balance_rules` e verificar se a nova seleção é distinta da existente antes de registrar em `ofx_balance_selection_events`.
