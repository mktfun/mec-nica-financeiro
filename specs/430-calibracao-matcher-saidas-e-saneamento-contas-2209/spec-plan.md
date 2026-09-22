# Spec Plan — Spec 430: Calibração do Matcher de Saídas, Correção do 400 Bad Request e Conciliação Loja a Loja 22/09

## Tasks Sequenciais

- [x] Task 1: [BACKEND] Corrigir bug 400 Bad Request em useBackendConciliacao.ts <!-- id: 1 -->
  - Substituir `.select('amount, status').neq('status', 'ignored')` por `.select('amount, match_status').neq('match_status', 'ignored')`.
  - Critério de verificação: Script node ou verificação de query direta no Supabase confirmando HTTP 200.
  - Skill: `skills/backend-patterns/SKILL.md`

- [x] Task 2: [BACKEND/DB] Blindar Matcher contra Falsos Positivos por Valor Cego <!-- id: 2 -->
  - Em `expenseMatcher.ts`, exigir correspondência de tokens de texto (mínimo 3 letras do primeiro nome/razão social) ou código externo nas Camadas 3 e 4.
  - Criar migration SQL atualizando `public.auto_match_saidas(text)` para incluir `WHERE` estrito de token matching em vez de `LIMIT 1` genérico no `ORDER BY`.
  - Desvincular no banco o par espúrio `Luis Henrique` x `Cartão Daniel` em 22/09.
  - Critério de verificação: Teste de matching com nomes divergentes confirmando ausência de match indevido.
  - Skill: `skills/database/SKILL.md`

- [x] Task 3: [FRONTEND/BACKEND] Implementar Desvinculação Atômica e Criação de Despesa Manual no Modal <!-- id: 3 -->
  - Em `useCategorizeOrphan.ts` e `StoreExtratoBancarioView.tsx`, garantir que ao categorizar manualmente uma saída (ex: Pró-labore), `matched_bill_id` seja anulado no OFX e o vínculo anterior seja liberado em `daily_manual_bills`.
  - Se a categoria tiver impacto no subtotal, registrar ou atualizar a conta em `daily_manual_bills` com `store_id` e `contabilizar_no_subtotal = true`.
  - Sincronizar badges da UI para priorizar a categoria manual quando não houver `matchedBill` legítimo.
  - Critério de verificação: Script node simulando categorização e comprovando criação da conta e desvinculação no banco.
  - Skill: `skills/frontend-design-pro/SKILL.md`

- [x] Task 4: [BACKEND] Equalizar Saídas Loja a Loja para Fatura Centralizada C6 em 22/09 <!-- id: 4 -->
  - Mapear a fatura C6 de R$ 116.209,60 paga em `brasicar.ofx` contra as contas do arquivo `BuscaContasAPagar.xls`.
  - Ajustar o motor para reconhecer a quitação centralizada das filiais e eliminar a falsa divergência de saídas em Mauá e Kennedy.
  - Critério de verificação: Script de validação pericial conferindo que a diferença de saídas nas lojas é equalizada.
  - Skill: `skills/backend-patterns/SKILL.md`

- [x] Task 5: [SECURITY/TEST] Executar Terminal Gate & Build Check <!-- id: 5 -->
  - Executar `npm run build` garantindo zero erros de compilação e tipagem TypeScript.
  - Critério de verificação: Terminal com exit code 0.
  - Skill: `skills/sdd-apply/SKILL.md`
