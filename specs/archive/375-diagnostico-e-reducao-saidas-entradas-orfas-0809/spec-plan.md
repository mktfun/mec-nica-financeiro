# Spec-Plan: Diagnóstico Forense e Resolução Automática de Saídas e Entradas Órfãs (375)

## Tasks Atômicas

- [x] `[PARSER]` **Correção de Datas Seriais do Excel em `contasPagarParser.ts`**
  - Adicionar suporte nativo à conversão de inteiros seriais do Excel (`typeof val === 'number'`) via `XLSX.SSF.parse_date_code`.
  - Converter códigos como `46269` para `'2026-09-04'` e `46270` para `'2026-09-05'`.
  - *Critério de Verificação*: Executar teste unitário com `BuscaContasAPagar.xls` e comprovar que todas as 53 contas têm `payment_date` e `due_date` válidos no formato `YYYY-MM-DD`.

- [x] `[MATCHING-CORE]` **Motor de Pareamento 1-para-N de Lotes SISPAG Salários em `expenseMatcher.ts`**
  - Implementar camada de batimento que identifica débitos OFX contendo `SISPAG` ou `SALARIO`.
  - Filtrar títulos em aberto de salários (`category = 'retirada_socios'` ou descrição com `SALARIO`) da mesma filial (e master/holding se rateado).
  - Se a soma dos títulos equivaler ao débito OFX (tolerância de R$ 0,10), vincular todos os títulos ao débito e marcar `matched_batch`.
  - *Critério de Verificação*: No conjunto de dados de 08/09/2026, os 8 débitos de SISPAG (R$ 5.053,00, R$ 2.960,61, R$ 4.753,00, R$ 6.061,13, R$ 4.477,44, R$ 7.851,00, R$ 2.213,00, R$ 680,48) casam com os 23 títulos de colaboradores.

- [x] `[MATCHING-CORE]` **Pareamento Automático de Transferências Intercompany em `expenseMatcher.ts`**
  - Detectar movimentações espelhadas no mesmo período entre contas de filiais do grupo (ex.: saída de R$ 6.000 para Brasicar e entrada de R$ 6.000 da Empório do Óleo).
  - Marcar ambas as pontas como casadas internamente com categoria `Transferência Entre Lojas [Apenas Conciliar]`.
  - *Critério de Verificação*: As transferências de R$ 6.000 (Piraporinha -> Planalto), R$ 4.000 (Kennedy -> Mauá) e R$ 4.000 (Kennedy -> Santo André) são auto-pareadas, eliminando 3 saídas e 3 entradas órfãs.

- [x] `[MATCHING-CORE]` **Auto-Cancelamento de Bloqueio/Desbloqueio PIX em `expenseMatcher.ts`**
  - Detectar débito `BLOQUEIO PIX` e crédito `DESBLOQUEIO PIX` de mesmo valor na mesma conta.
  - Marcar ambos como auto-conciliados (estorno com efeito líquido zero).
  - *Critério de Verificação*: Débito e crédito de R$ 900 no Rei do Módulo são auto-conciliados, eliminando 1 saída e 1 entrada órfã.

- [x] `[DB]` **Atualização da RPC `public.auto_match_saidas` no PostgreSQL**
  - Criar migration `supabase/migrations/20260908000035_batch_sispag_and_intercompany_matching.sql`.
  - Implementar lógica equivalente no banco de dados para vincular múltiplos `daily_manual_bills` ao mesmo `ofx_transactions.id` quando detectado lote SISPAG.
  - Implementar detecção de transferências intercompany no banco.
  - *Critério de Verificação*: Rodar a RPC `public.auto_match_saidas('2026-09-08')` no Supabase e confirmar que `orphan_outflows` cai para 8.

- [x] `[UI]` **Aprimoramento do Step 2 de Justificativas (`Step2NonRevenueJustifications.tsx`)**
  - Expandir `inferOutflowCategory` para detectar `SAQUE DIN ATM CART001008` e atribuir `Retirada de Sócios / Sangria / Saque em Dinheiro` com `adicionaNoContas: false`.
  - Assegurar que as abas exibam a contagem saneada: Saídas Órfãs (8) e Entradas Órfãs (2).
  - *Critério de Verificação*: Testar a tela com os dados de 08/09/2026 e confirmar que a aba de saídas mostra 8 e a de entradas mostra 2.

- [x] `[BUILD-GATE]` **Auditoria de Build e Integridade TypeScript**
  - Executar `npm run build` e confirmar 0 erros de tipos.
  - *Critério de Verificação*: Build completa com sucesso em menos de 5 segundos.

