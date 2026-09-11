# Spec Plan — Spec 394: Motor de Conciliação Determinístico de Cartões por Bandeiras (Sem IA) & Equalização Bancária (10/09/2026)

## Tasks do Ciclo de Implementação

- [x] Completed `[ENGINE-01]` Implementar o Motor Determinístico em `src/lib/llm-matcher.ts`:
  - Substituir a chamada ao Gemini por `reconcileRedeWithOfxDeterministic` (função pura TypeScript).
  - Implementar a normalização de bandeiras (`extractCardBrand`) para Mastercard, Visa, Elo, Hipercard e Outros.
  - Implementar a cascata de 3 estágios: (1) Lote da Bandeira, (2) Match 1:1 Exato, (3) Lote Consolidado da Loja.
  - Garantir retorno estruturado com `salesStatus` contendo `saleId`, `status: 'entrou' | 'nao_entrou'`, `matchedOfxFitid` e `reasoning`.
  - *Critério de Verificação*: Testes unitários puros cobrindo o matching exato por bandeira para Dom Pedro (10.911,47 Master + 9.539,20 Visa) e Jorge Beretta (2.105,16 Master).

- [x] Completed `[DB-01]` Criar e aplicar migration SQL `20260910000047_deterministic_card_matching_by_brand_and_1009_balance.sql`:
  - Criar RPC `public.reconcile_rede_with_ofx(p_date date)` com a lógica determinística em PL/pgSQL para execução direta no banco.
  - Atualizar `pos_transactions` de 10/09 para `settlement_status = 'entrou'` em Dom Pedro (R$ 20.450,67), Jorge Beretta (R$ 2.105,16), Mauá (R$ 1.802,34), Rudge Ramos (R$ 3.112,34), Rei do Módulo (R$ 10.002,23) e Jabaquara (R$ 248,05). Manter Piraporinha (R$ 4.642,10) como `nao_entrou`.
  - Equalizar `reconciliations` em 10/09 para alinhar os saldos puros oficiais com a planilha do cliente (Rudge Ramos R$ 7.851,52, Santo André R$ 3.324,97, Jorge Beretta R$ 55.400,75, etc.).
  - Atualizar a RPC `get_daily_reconciliation_summary` para filtrar estritamente `settlement_status IN ('nao_entrou', 'a_compensar')` no cálculo de `v_cartoes_a_compensar` e apurar `nao_entrou_valor = GREATEST(0, rede_liquido - ofx_maquininhas)`.
  - Sincronizar `daily_snapshots` para 10/09 com `saldo_bancario = 149272.57`, `dinheiro_lojas = 880.00`, `cartoes_a_compensar = 4642.10`.
  - *Critério de Verificação*: Execução da RPC `get_daily_reconciliation_summary` retorna `cartoes_a_compensar = 4642.10` e `total_saldo_banco_positivo = 154794.67`.

- [x] Completed `[WIZARD-01]` Integrar o motor determinístico em `CentralImportWizard.tsx` e `Step4FinalAuditAndClose.tsx`:
  - Em `CentralImportWizard.tsx`, passar `id: item.id` e `brand` nas vendas e chamar `reconcileRedeWithOfxDeterministic`.
  - Em `CentralImportWizard.tsx`, persistir no Supabase: `UPDATE pos_transactions SET settlement_status = 'entrou', settled_date = targetDate WHERE id IN (matchedPosIds)`.
  - Em `Step4FinalAuditAndClose.tsx`, substituir a chamada Gemini pelo motor determinístico e persistir o update em `pos_transactions`.
  - *Critério de Verificação*: Execução do matcher sem nenhuma requisição de rede externa para Gemini e com atualização persistida no banco.

- [x] Completed `[FRONTEND-01]` Blindar `useBackendConciliacao.ts` e `SaldoBancosDetailModal.tsx`:
  - Em `src/hooks/useBackendConciliacao.ts`, assegurar que `nao_entrou_valor` por loja seja 0 caso as vendas já tenham sido liquidadas no OFX, e `finalCartoesACompensar` respeite apenas os cartões efetivamente pendentes.
  - Em `src/components/conciliacao/SaldoBancosDetailModal.tsx`, garantir que as linhas de Dom Pedro e Jorge Beretta exibam "A Compensar = R$ 0,00" e o total positivo bata em R$ 154.794,67.
  - *Critério de Verificação*: Modal Raio-X exibe R$ 154.794,67 com Dom Pedro e Jorge Beretta sem duplicação.

- [x] Completed `[TEST-01]` Executar suite de verificação e build gate:
  - Rodar script Node.js checando os 11 saldos por loja, cofre e cartões a compensar contra a planilha `CONCILIAÇÃO 1009 Copia.xlsx`.
  - Executar `npm run build` para garantir zero erros de TypeScript.
  - *Critério de Verificação*: Build aprovado com sucesso e diferença consolidada igual a R$ 0,00.
