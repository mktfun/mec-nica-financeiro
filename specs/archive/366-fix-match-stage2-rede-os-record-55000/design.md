# Technical Design — Spec 366: Correção de `v_chosen_os RECORD` na RPC `match_stage2_rede_os`

## 1. Arquitetura e Engenharia de Dados (PL/pgSQL)

### Diagnóstico do Erro 55000
No PostgreSQL, o tipo `RECORD` é um tipo de dados polimórfico cujo descritor de tupla (`TupleDesc`) só é instanciado em tempo de execução quando uma linha inteira é atribuída a ele. 
Se uma variável do tipo `RECORD` não tiver sido atribuída antes de uma tentativa de ler seus membros (ex.: `v_chosen_os.id`), o gerenciador de tipos do PL/pgSQL falha com `ERRCODE_OBJECT_NOT_IN_PREREQUISITE_STATE` (`55000`).

### Refatoração para Escalares Tipados
Em vez de depender de uma variável `RECORD`, a RPC passará a usar 5 variáveis escalares independentes com tipos pré-computados pelo PostgreSQL:
```sql
DECLARE
    v_chosen_os_id UUID;
    v_chosen_os_number TEXT;
    v_chosen_os_total_value NUMERIC;
    v_chosen_os_paid_value NUMERIC;
    v_chosen_os_status TEXT;
```

### Ciclo de Vida dentro do Loop `FOR v_pos IN ...`:
1. **Reset Garantido no Topo:**
   ```sql
   v_chosen_os_id := NULL;
   v_chosen_os_number := NULL;
   v_chosen_os_total_value := NULL;
   v_chosen_os_paid_value := NULL;
   v_chosen_os_status := NULL;
   ```
2. **Atribuição no Candidato Único ou Desempatado:**
   ```sql
   SELECT id, os_number, total_value, paid_value, status
   INTO v_chosen_os_id, v_chosen_os_number, v_chosen_os_total_value, v_chosen_os_paid_value, v_chosen_os_status
   FROM public.patio_os
   WHERE id = ...;
   ```
3. **Guarda Segura de Casamento:**
   ```sql
   IF v_chosen_os_id IS NOT NULL THEN
       -- atualiza pos_transactions, patio_os, conciliation_matches
   END IF;
   ```

---

## 2. Riscos e Mitigações
- **Risco:** Regressão no contrato de retorno para o frontend (`Fase2RedeVsOsReview.tsx`).
  - **Mitigação:** O retorno final da função permanece 100% inalterado, preservando as chaves JSONB esperadas pelo frontend (`success`, `target_date`, `matched_count`, `collisions_count`, `collisions`, `totals`, etc.).
- **Risco:** Falha de tipagem na execução remota.
  - **Mitigação:** Validação remota com `SELECT public.match_stage2_rede_os('2026-09-02')` via Supabase CLI.
