# Proposal — Spec 366: Correção do Erro PostgreSQL 55000 (`v_chosen_os` is not assigned yet) na RPC `match_stage2_rede_os`

## 1. Contexto e Problema
Ao processar vendas da adquirente Rede na Fase 2 da esteira de fechamento manual (`Fase2RedeVsOsReview.tsx`), o Supabase retorna erro HTTP 500 com a seguinte exceção PostgreSQL:
```json
{
  "code": "55000",
  "details": "The tuple structure of a not-yet-assigned record is indeterminate.",
  "hint": null,
  "message": "record \"v_chosen_os\" is not assigned yet"
}
```

### Causa Raiz
Na migration `20260903000029_recalibrate_match_stage2_rede_os.sql`, a variável `v_chosen_os` foi declarada como o pseudotipo genérico `RECORD`.
No motor PL/pgSQL do PostgreSQL:
1. Variáveis `RECORD` não possuem estrutura de tupla predefinida até que recebam uma linha via `SELECT ... INTO v_chosen_os`.
2. Quando uma transação POS não encontra candidatos nos Tiers 1, 2 e 3 (`v_candidates_count = 0`), ou quando há múltiplos candidatos sem desempate temporal, o bloco `SELECT ... INTO v_chosen_os` é pulado.
3. Ao alcançar a linha 252 (`IF v_chosen_os.id IS NOT NULL THEN`), o PostgreSQL tenta inspecionar o atributo `.id` de uma variável não atribuída e cuja estrutura de tupla é indeterminada, disparando o erro SQLSTATE `55000`.

---

## 2. Solução Proposta
1. Criar a migration `supabase/migrations/20260903000030_fix_match_stage2_rede_os_v_chosen_os_record.sql`.
2. Substituir a variável genérica `v_chosen_os RECORD;` por variáveis escalares estritamente tipadas:
   - `v_chosen_os_id UUID;`
   - `v_chosen_os_number TEXT;`
   - `v_chosen_os_total_value NUMERIC;`
   - `v_chosen_os_paid_value NUMERIC;`
   - `v_chosen_os_status TEXT;`
3. No início de cada iteração do loop `FOR v_pos IN ...`, inicializar explicitamente todos os escalares como `NULL`.
4. Nos blocos de desempate, direcionar o `SELECT ... INTO` para os campos escalares tipados.
5. Substituir a checagem por `IF v_chosen_os_id IS NOT NULL THEN`, eliminando 100% a dependência de layout de tupla dinâmico.
6. Aplicar a migration no banco remoto Supabase via CLI headless (`supabase db query --linked`).
7. Testar a execução remota da RPC com `SELECT public.match_stage2_rede_os('2026-09-02')`.

---

## 3. Critérios de Aceite
- [ ] A RPC `match_stage2_rede_os` executa sem erro 55000 para qualquer lote de transações (com match, sem match ou com colisões).
- [ ] O retorno da RPC mantém a estrutura de contrato JSONB idêntica (`success`, `matched_count`, `collisions_count`, etc.).
- [ ] `bun run build` compila com sucesso com código 0.
