# Design: Paridade de Elegibilidade entre Matcher Automático e Manual e Desvinculação Consistente (Spec 466 — Revisão Final)

## 1. Arquitetura de Fluxo: `match_stage2_rede_os`, `get_rede_os_eligible_candidates` e `link_manual_rede_to_os`

```
                   ┌───────────────────────────────────────────────┐
                   │    Venda Maquininha Rede (pos_transactions)   │
                   │    id, store_id, gross_amount, target_date,   │
                   │    payment_method, transaction_type='venda'   │
                   └───────────────────────┬───────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│match_stage2_rede │             │get_rede_os_elig_ │             │link_manual_rede_ │
│_os (Automático)  │             │candidates(Manual)│             │to_os (Manual)    │
└────────┬─────────┘             └────────┬─────────┘             └────────┬─────────┘
         │                                │                                │
         └────────────────┬───────────────┘                                │
                          │                                                │
                          ▼                                                │
         ┌────────────────────────────────────────┐                        │
         │     REGRA DE ELEGIBILIDADE UNIFICADA   │                        │
         │                                        │                        │
         │ 1. Mesma Loja: store_id = v_pos.store_id│                        │
         │ 2. Data Válida: target_date coincidente│                        │
         │ 3. Modalidade e Valor: tolerância 0.05 │                        │
         │ 4. VÍNCULO ATIVO REAL VERIFICADO:      │                        │
         │    - pt.matched_os_number na mesma loja│                        │
         │    - conciliation_matches ativo:       │                        │
         │      apenas se POS referenciado existir│                        │
         │      e conferir com mesma loja e OS!   │                        │
         │    - ZERO checagem de match_status!    │                        │
         └────────────────┬───────────────────────┘                        │
                          │                                                │
               ┌──────────┴──────────┐                                     │
               ▼                     ▼                                     │
       [Candidatos = 1]     [Colisão / Competição]                         │
               │                     │                                     │
               ▼                     ▼                                     │
        Auto-Match OK!       Auto-Match Bloqueado                          │
               │                                                           │
               └─────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
                   ┌──────────────────────────────────────┐
                   │       PERSISTÊNCIA EM CONCILIAÇÃO    │
                   │                                      │
                   │ conciliation_matches:                │
                   │ - status: 'baixa_aplicada'           │
                   │           ou 'vinculo_informativo'   │
                   │ - divergence_amount:                 │
                   │   v_actually_applied (R$ baixado)    │
                   │                                      │
                   │ DESVINCULAÇÃO (unlink_manual_os_match│
                   │ - Se status <> 'baixa_aplicada':     │
                   │   NÃO subtrai nada de patio_os!      │
                   │ - Se status = 'baixa_aplicada':      │
                   │   reverte exatamente divergence_amoun│
                   │ - Libera só modalidade da venda      │
                   │ - Idempotente (no-op se repetido)    │
                   │ - match_status -> 'pending'          │
                   └──────────────────────────────────────┘
```

---

## 2. Definição Estrita de Vínculo Ativo

### 2.1 Verificação de Vínculo em `pos_transactions`
Uma OS `p.os_number` tem vínculo ativo na maquineta se existir transação na mesma filial e data com `pt.matched_os_number = p.os_number` e `pt.id <> v_pos.id`.

### 2.2 Verificação de Vínculo em `conciliation_matches` com Proteção Anti-Órfão
Um registro em `conciliation_matches` só é considerado vínculo ativo se:
```sql
EXISTS (
    SELECT 1
    FROM public.conciliation_matches cm
    JOIN public.pos_transactions pt_ref ON pt_ref.id = cm.rede_transaction_id
    WHERE cm.store_id = v_pos.store_id
      AND cm.target_date = p_target_date
      AND cm.system_os_number = p.os_number
      AND cm.rede_transaction_id <> v_pos.id
      AND pt_ref.store_id = v_pos.store_id
      AND pt_ref.matched_os_number = p.os_number
)
```
Se o registro em `conciliation_matches` apontar para uma transação `rede_transaction_id` que foi excluída, desvinculada ou pertence a outra loja/OS, **ele é ignorado como órfão e NÃO bloqueia a OS**.

### 2.3 Isolamento por Loja
Todas as verificações agregam por `(store_id, os_number)`. A OS 443 da Loja A jamais bloqueia a OS 443 da Loja B.

---

## 3. Armazenamento Compatível e Desvinculação Atômica

### 3.1 Armazenamento em `link_manual_rede_to_os` e `match_stage2_rede_os`
Ao efetivar a ligação entre POS e OS:
- Se a OS já era quitada (`paid_value >= total_value - 0.05`):
  `v_actually_applied := 0;`
  `v_effect_status := 'vinculo_informativo';`
- Se a OS estava em aberto e recebeu baixa:
  `v_actually_applied := v_paid_after - v_paid_before;` (abrange baixa total ou baixa parcial)
  `v_effect_status := 'baixa_aplicada';`
- Gravação em `conciliation_matches`:
  `status = v_effect_status`, `divergence_amount = v_actually_applied`.

### 3.2 Desvinculação Segura em `unlink_manual_os_match`
1. **Consulta Prévia:** Lê `status` e `divergence_amount` em `conciliation_matches` antes de deletar o registro.
2. **Salvaguarda do Saldo do Cliente:**
   - Se `status = 'baixa_aplicada'`: deduz exclusivamente `COALESCE(divergence_amount, 0)` do saldo da OS (`paid_value`, `credit_value`/`debit_value`).
   - Se `status <> 'baixa_aplicada'` ou na ausência de registro: **não deduz valor algum**. O pagamento do cliente permanece intacto.
3. **Liberação Estrita da Modalidade:**
   - Se a transação for Crédito: estorna apenas `consumed_credit` em `os_import_observations`.
   - Se a transação for Débito: estorna apenas `consumed_debit` em `os_import_observations`.
4. **Idempotência:**
   - Se a transação já estiver desvinculada (`matched_os_number IS NULL`), retorna sucesso imediato sem mutações (no-op).
5. **Transição de Status da OS:**
   - Se a OS não tiver outros vínculos ativos na loja, define `patio_os.match_status = 'pending'`.

---

## 4. Matriz de Cenários de Teste em Banco Descartável

| # | Cenário | Condição Inicial | Resultado Esperado |
|---|---|---|---|
| 1 | **Paridade Jabaquara OS 443** | OS 100% paga (R$ 5.800) com `match_status = 'MATCHED'` residual e sem POS vinculado | `get_rede_os_eligible_candidates` e `match_stage2_rede_os` reconhecem e realizam auto-match 1:1. |
| 2 | **Isolamento por Loja** | Loja A vinculou OS 443. Loja B tem OS 443 desvinculada | Loja B vincula OS 443 normalmente sem interferência da Loja A. |
| 3 | **Vínculos Válidos Existentes** | Transação POS já vinculada legitimamente a uma OS | O matcher não sobrescreve o vínculo nem o consome novamente. |
| 4 | **Vínculo Órfão em `conciliation_matches`** | Registro em `conciliation_matches` aponta para POS inexistente ou desvinculada | O matcher ignora o registro órfão e permite o pareamento da OS legítima. |
| 5 | **Baixa Parcial e Desvinculação Repetida** | OS total 1.000, paga 400 (saldo 600). POS de 1.000 vincula (baixa parcial de 600) | `divergence_amount` grava 600. Desvinculação restaura OS para 400. Segunda desvinculação é no-op e mantém 400. |
| 6 | **Desvinculação Informativa e Liberação Estrita de Modalidade** | OS quitada (R$ 2.000) vinculada com venda crédito de R$ 2.000 | Desvinculação mantém OS com R$ 2.000 pagos, estorna só `consumed_credit`, muda status para `'pending'`. |
| 7 | **Detecção de Colisões** | 2 vendas de mesmo valor disputam 1 OS ou 1 venda disputa 2 OSs | Auto-match bloqueado; colisão registrada com detalhamento para painel manual. |
| 8 | **Ciclo Completo Spec 465** | Importação com incremento (400 -> 2727 = 2327) → match → reset → reimport | Incremento reproduzido, reset restaura base e reimportação permite novo match idêntico. |

---

## 5. Diretriz de Execução em Banco Descartável

- **Escopo Isolado:** Lojas `test-store-*` e datas `2099-xx-xx`. Zero escritas em dados de produção.
- **Critério de Disponibilidade:** As funções SQL reais devem rodar no banco descartável antes de qualquer consideração para produção. Se o banco estiver indisponível ou inacessível, o status será marcado como **NÃO VERIFICADO** e a tarefa será suspensa.
- **Rollback Garantido:** Arquivo [`rollback_20261001000005.sql`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/specs/466-paridade-elegibilidade-rede-os-e-desvinculo/rollback_20261001000005.sql) com a íntegra das 4 funções anteriores de `20261001000002`.

