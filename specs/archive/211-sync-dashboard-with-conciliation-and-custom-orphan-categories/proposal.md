# Proposal: 211-sync-dashboard-with-conciliation-and-custom-orphan-categories

## 1. Diretriz Suprema

**100% dos cálculos, consolidações e regras de negócio do Dashboard são processados no Banco de Dados (PostgreSQL via RPC `get_dashboard_metrics`), com ZERO lógica ou cálculo redundante no Frontend.**

---

## 2. Problemas Identificados

1. **Categorização de Órfãos Muito Restrita (Aba 4: Banco Sem Origem)**:
   - Em `OrphanCategorizationModal.tsx`, as categorias estão limitadas a 4 botões estáticos.
   - O usuário precisa poder **digitar livremente qualquer categoria manual** em um campo de texto (ex: "Reembolso Limpa Baú", "Venda de Juros 1088", "Aporte Sócio", "Venda de Sucata") ou escolher chips rápidos.

2. **Dashboard (`/` Visão Geral) com Dados Inconsistentes**:
   - `get_dashboard_metrics` anterior continha fórmula incorreta (`diferenca = aReceber - Saldo`), gerando `-R$ 140.340,58`.
   - `faturamentoAnterior` comparava o delta do dia com o acumulado total do odômetro (`R$ 369.671,95`), acusando uma queda falsa de `-79.7%`.
   - As colunas **Contas (OFX)** e **Pátio** na tabela por filial não estavam sendo consolidadas na RPC.

---

## 3. Solução Proposta (100% RPC Backend)

1. **Atualização da RPC `public.get_dashboard_metrics(p_date DATE)`**:
   - Retorna em uma única query otimizada:
     - 🏦 `saldoTotal`: Soma real dos saldos bancários das filiais (`bank_total`).
     - 💼 `caixaAtual`: Caixa consolidado oficial (`Saldo + Dinheiro MP + A Receber + Pátio na Loja`).
     - 💳 `contasAPagar`: Total de contas e saídas do dia (+ juros).
     - ⚖️ `diferenca`: Diferença oficial da conciliação do dia (`R$ 0,00` quando conciliada).
     - 📈 `faturamentoAtual`: Faturamento do dia apurado no odômetro (+ justificados).
     - 📉 `faturamentoAnterior`: Faturamento diário do dia anterior (`R$ 52.120,77`).
     - 📊 `variacaoFaturamento`: Variação percentual calculada no PostgreSQL (`+43.9%`).
     - 🏢 `porLoja`: Array com `store_id`, `store_name`, `saldo_banco`, `faturamento`, `contas` (saídas OFX), `resultado` (`faturamento - contas`), `veiculos_patio` (contagem de OSs) e `na_loja_os` (valor em pátio).
     - 📅 `historicoMacro`: Últimos 7 dias de fechamentos para o gráfico macro.

2. **Input Manual Livre em `OrphanCategorizationModal.tsx`**:
   - Campo de texto inteligente com auto-sugestões em chips para entrada livre de qualquer categoria.

3. **Frontend Magro & Limpo (`useBackendDashboard.ts` & `src/routes/index.tsx`)**:
   - Simplesmente invoca `supabase.rpc('get_dashboard_metrics', { p_date })` e repassa os dados calculados diretamente para a UI.

---

## 4. Contratos de Dados

- **RPC `public.get_dashboard_metrics(p_date DATE)`**:
  - Retorna `jsonb` completo contendo todas as métricas consolidadas e o breakdown por loja.
