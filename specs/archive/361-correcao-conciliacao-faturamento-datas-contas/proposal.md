# 📋 SDD Proposal: Spec 361 — Correção Canônica da Conciliação Diária: Navegação de Datas, Odômetro/Faturamento, Dinâmica de Contas, Pátio e A Receber

## 1. Problema Identificado
Durante a conciliação diária de 04/09/2026 e dias anteriores, o usuário identificou 6 anomalias críticas no painel de conciliação:

1. **Troca de Data Travada no Dia 04:** Ao avançar ou retroceder a data no calendário/setas do painel, a URL não era atualizada e o `useEffect` de `conciliacao.index.tsx` forçava a restauração de `searchDate` da rota, fazendo alguns números piscarem temporariamente mas a tela permanecer travada no dia 4.
2. **Encadeamento Quebrado do Faturamento Odômetro:** Nos dias 02/09 e 03/09, o input manual de faturamento não permitia cálculo claro de `odometro_atual - odometro_anterior`, forçando a gravação direta do valor líquido do dia (`faturamento = 38.153,05` e `39.658,70`). Quando hoje (04/09) foi informado o acumulado (93.066,93), o sistema subtraiu `93.066,93 - 39.658,70 = 53.408,23`, inflando o faturamento do dia em quase R$ 50.000 e gerando uma divergência errônea de +R$ 49.548,39.
3. **Pátio com Queda Brusca (R$ 11k vs R$ 28k ontem):** A importação centralizada calculou o pátio restrito aos arquivos enviados no lote de hoje (R$ 11.805,22), sem transparência do passivo pendente acumulado das 10 filiais, e a query da RPC desconsiderava o status histórico das OSs finalizadas no decorrer do dia.
4. **Instabilidade no Saldo "A Receber" (Boletos):** O saldo de títulos a receber (R$ 8.049,67) não herdava confiavelmente o dia anterior no wizard de importação quando não preenchido, chegando a puxar R$ 27.835,32 indevidamente em vez de manter a estabilidade patrimonial da carteira.
5. **Lançamento de Contas não Soma no "Contas (Manual)":** Ao cadastrar uma despesa avulsa em `ContasManualModal.tsx` (`daily_manual_bills`), a RPC `get_daily_reconciliation_summary` ignorava a inserção caso já existisse um snapshot gravado, mantendo o valor estático de `metadata.subtotal_contas` ou `contas_a_pagar`.
6. **Ajustes de Faturamento não Reagem Dinamicamente:** Lançamentos em `daily_revenue_adjustments` ficavam dessincronizados do total do dia caso o snapshot já tivesse gravado `faturamento_periodo`.

---

## 2. Solução Proposta
Uma refatoração cirúrgica e determinística nas camadas de Roteamento, Backend/RPC e UI de Conciliação:

1. **Navegação de Datas SSOT (Single Source of Truth):**
   - Eliminar a disputa de estado em `src/routes/conciliacao.index.tsx`. O search param `?date=YYYY-MM-DD` passa a ser a fonte canônica.
   - Os controles `handleDayChange` e `onDateSelect` realizam navegação via TanStack Router (`navigate({ search: { date: newDate }, replace: true })`), sincronizando URL, dados e UI sem reverter para o dia 4.

2. **Calculadora Bidirecional de Faturamento (Odômetro vs Líquido do Dia):**
   - Permitir ao operador tanto informar o **Odômetro Acumulado de Hoje** (com cálculo automático: `Hoje - Anterior = Faturamento do Dia`) quanto informar diretamente o **Faturamento Líquido do Dia** (com cálculo automático do odômetro resultante: `Odômetro Hoje = Anterior + Líquido`).
   - Permitir conferência e ajuste do **Odômetro Anterior** caso tenha havido quebra de sequência nos dias 02 e 03.
   - Gravar no snapshot explicitamente `metadata.faturamento_oi_base`, `metadata.odometro_hoje` e `metadata.faturamento_anterior`.
   - Atualizar a RPC `get_daily_reconciliation_summary` para honrar `metadata.faturamento_oi_base` quando existente, evitando subtrações anômalas.
   - Ajustar o snapshot de 04/09 para o faturamento real conferido.

3. **RPC Reativa para Contas e Ajustes (Fim do Bloqueio por Snapshot Estático):**
   - Na RPC `get_daily_reconciliation_summary`, calcular `v_contas_manual` e `v_subtotal_contas` com base na soma real das contas de `daily_manual_bills` (`contabilizar_no_subtotal = true`) quando existirem contas para o dia, garantindo que novas despesas entrem imediatamente no total.
   - No `ContasManualModal.tsx`, acionar rotina de re-sincronização do snapshot diário após inclusão/edição/remoção de contas.
   - No `FaturamentoDetalhesModal.tsx`, permitir ajuste da base e dos adicionais com atualização imediata.

4. **Blindagem Patrimonial de "A Receber" (Boletos):**
   - O campo `a_receber_manual` em `CentralImportWizard` e `ResumoDiaPanel` passa a ter fallback obrigatório no `previousSnapshot.a_receber_manual` (R$ 8.049,67), prevenindo saltos para R$ 20k+ ou valores não justificados.

5. **Auditoria e Reconciliação do Pátio (OSs em Aberto):**
   - Exibir no modal de pátio o confronto entre saldo herdado anterior (R$ 28k), baixas do dia e saldo residual ativo por loja.
   - Permitir saneamento e ajuste pontual no fechamento do dia.

---

## 3. Contratos de Dados e Módulos Tocados
- **Frontend / Rotas:**
  - `src/routes/conciliacao.index.tsx` (SSOT da data via search param TanStack Router)
  - `src/components/conciliacao/ResumoDiaPanel.tsx` (Calculadora bidirecional de Odômetro/Faturamento, reatividade de contas e pátio)
  - `src/components/conciliacao/ContasManualModal.tsx` (Sincronização imediata pós-lançamento de conta)
  - `src/components/conciliacao/FaturamentoDetalhesModal.tsx` (Composição DRE e ajuste base)
  - `src/components/importacoes/CentralImportWizard.tsx` (Fallback canônico de `a_receber_manual` herdando do dia anterior)
- **Backend / Postgres:**
  - Migration SQL atualizando a RPC canônica `public.get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)` para garantir cálculo reativo de `daily_manual_bills` e respeito a `faturamento_oi_base`.
  - Script/correção de equalização do snapshot de 04/09/2026.

---

## 4. Principais Riscos e Mitigações
- **Risco 1:** Alterar a RPC e afetar o fechamento de dias passados já auditados.
  - *Mitigação:* Apenas dias não fechados ou com novas despesas terão cálculo reativo; snapshots passados com `is_closed = true` e sem alterações mantêm os dados congelados se `forceDynamic` não for acionado.
- **Risco 2:** Perda de dados ou loop de re-render na troca de data.
  - *Mitigação:* Usar `search.date` como fonte única da verdade e `navigate({ replace: true })`, eliminando loops de `useEffect`.
