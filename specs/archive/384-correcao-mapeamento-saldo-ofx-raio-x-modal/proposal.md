# Proposal: Correção de Mapeamento de Saldo Bancário OFX no Modal Raio-X por Filial (Spec 384)

## 1. 🎯 Diagnóstico do Problema e Evidências Reais

### A. O Sintoma Relatado
Ao abrir o modal **Raio-X de Saldos Bancários & Dinheiro por Filial** (`SaldoBancosDetailModal.tsx`) a partir do Card do Pilar 1 em `/conciliacao`, a grade exibe:
- **Coluna Extrato OFX (Itaú):** `R$ 0,00` para todas as 10 lojas monitoradas.
- **Coluna Dinheiro no Cofre / Loja:** `-` para todas as lojas.
- **Coluna Maquininhas (Rede):** `-` para todas as lojas.
- **Coluna Saldo Consolidado:** preenchida corretamente com o saldo bancário de cada loja (ex: Planalto `R$ 322,29`, Rudge Ramos `R$ 4.739,18`, Jorge Beretta `R$ 55.400,75`, Jabaquara `-R$ 10.453,68`, etc.).
- **Rodapé TOTAIS CONSOLIDADOS:** `Extrato OFX (Itaú) = R$ 0,00`, `Dinheiro no Cofre = R$ 0,00`, `Maquininhas = R$ 0,00`, `Saldo Consolidado = R$ 135.706,55`.
- **Cards de Topo:** `Bancos Positivos (Real) = R$ 146.160,23`, `(-) Cheque Especial = - R$ 10.453,68`, `Líquido Holding = R$ 135.706,55`.

### B. Causa-Raiz Técnica (Linhas e Contratos Reais)
No arquivo [SaldoBancosDetailModal.tsx](file:///c:/Users/User/projects/mec-nica-financeiro/src/components/conciliacao/SaldoBancosDetailModal.tsx#L53-L72):
```tsx
const rows = useMemo(() => {
  return effectiveStores.map((s: any) => {
    const saldoOfxPuro = Number(s.saldo_banco_ofx ?? 0);
    const dinheiroLoja = Number(s.dinheiro_loja ?? 0);
    const maquininhaNaoEntrou = Number(s.nao_entrou_valor ?? 0);
    const saldoConsolidado = Number(s.saldo_banco ?? (saldoOfxPuro + dinheiroLoja + maquininhaNaoEntrou));
    ...
```
1. **Desalinhamento de Chaves entre RPC e Componente:**
   - A RPC canônica `get_daily_reconciliation_summary` (atualizada pela migration `20260911000041_fix_contas_extras_and_revenue_adjustments.sql`, linhas 107-139) monta o JSON de cada loja (`v_stores_detail`) com os seguintes campos:
     - `'saldo_banco': COALESCE(bancos.saldo_bancos, 0)`
     - `'saldo_bancos': COALESCE(bancos.saldo_bancos, 0)`
     - `'saldo_total': COALESCE(bancos.saldo_bancos, 0)`
     - `'saldo_banco_positivo': COALESCE(bancos.saldo_positivo, 0)`
     - `'saldo_negativo_itau': COALESCE(bancos.saldo_negativo, 0)`
     - `'dinheiro_lojas': COALESCE(cofre.saldo_cofre, 0)` (plural com `s`)
   - A RPC **NÃO** emite a chave `saldo_banco_ofx` nem `dinheiro_loja` (no singular).
2. **Efeito Cascata no Frontend:**
   - `s.saldo_banco_ofx` vinha `undefined`, resultando em `saldoOfxPuro = 0` para todas as lojas.
   - A coluna "Extrato OFX (Itaú)" renderizava `formatCurrency(0)` -> `R$ 0,00`.
   - Como `saldoConsolidado` lia com fallback `s.saldo_banco`, ele pegava o saldo real do banco (`322.29`, `55400.75`), criando a aparente incoerência onde o extrato puro estava zerado mas o consolidado estava preenchido.
   - Em contraste, componentes maduros do projeto como [ConciliacaoLojasView.tsx](file:///c:/Users/User/projects/mec-nica-financeiro/src/components/conciliacao/ConciliacaoLojasView.tsx#L58-L78) aplicam a extração defensiva multi-alias:
     ```tsx
     saldoBanco: Number(rawLog?.saldo_banco ?? rawLog?.saldo_banco_itau ?? rawLog?.saldo_banco_ofx ?? 0),
     dinheiroLoja: Number(rawLog?.dinheiro_loja ?? rawLog?.dinheiro_lojas ?? rawLog?.cofre_total ?? 0),
     ```

---

## 2. 💡 Solução Proposta

### A. Frontend: Multi-Alias Defensivo e Cálculo Coerente em `SaldoBancosDetailModal.tsx`
1. Atualizar a extração das propriedades de cada filial com tolerância a múltiplos formatos:
   - `saldoOfxPuro`: `Number(s.saldo_banco_ofx ?? s.saldo_banco ?? s.saldo_bancos ?? s.saldo_banco_itau ?? s.saldo_total ?? 0)`
   - `dinheiroLoja`: `Number(s.dinheiro_loja ?? s.dinheiro_lojas ?? s.cofre_total ?? s.saldo_cofre ?? 0)`
   - `maquininhaNaoEntrou`: `Number(s.nao_entrou_valor ?? s.cartoes_a_compensar ?? 0)`
   - `saldoConsolidado`: `Number(s.saldo_consolidado ?? (saldoOfxPuro + dinheiroLoja + maquininhaNaoEntrou))`
2. Alinhar a redução de `totals`:
   - `ofxPositivo`: soma de `saldoOfxPuro` onde `saldoOfxPuro > 0`
   - `ofxNegativo`: soma de `|saldoOfxPuro|` onde `saldoOfxPuro < 0`
   - `ofxTotal`: soma líquida de todos os `saldoOfxPuro`
   - `positivosReal`: soma de saldos consolidados positivos
   - `devedorReal`: soma de saldos consolidados negativos
   - `dinheiro`: soma de `dinheiroLoja`
   - `maquininhas`: soma de `maquininhaNaoEntrou`
   - `total`: soma consolidada global
3. Atualizar a tipagem de `StoreReconciliationSummary` em [src/hooks/useBackendConciliacao.ts](file:///c:/Users/User/projects/mec-nica-financeiro/src/hooks/useBackendConciliacao.ts) para incluir formalmente os aliases aceitos (`saldo_bancos`, `dinheiro_lojas`, `saldo_banco_itau`).

### B. Backend: Adicionar Aliases Canônicos no `jsonb_build_object` da RPC
1. Criar migration SQL incremental garantindo que `get_daily_reconciliation_summary` emita explicitamente:
   - `'saldo_banco_ofx', COALESCE(bancos.saldo_bancos, 0)`
   - `'saldo_banco_itau', COALESCE(bancos.saldo_bancos, 0)`
   - `'dinheiro_loja', COALESCE(cofre.saldo_cofre, 0)`
   - `'nao_entrou_valor', 0` (ou valor apurado de cartões pendentes)
   Isso sela o contrato tanto para consumidores antigos quanto novos da RPC.

---

## 3. 🛡️ Riscos e Mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| Dupla contagem de saldo se `saldoConsolidado` somar `saldoOfxPuro + s.saldo_banco` | Alta | `saldoConsolidado` deve ser calculado como a soma vetorial canônica `(saldoOfxPuro + dinheiroLoja + maquininhaNaoEntrou)`, evitando reutilizar `s.saldo_banco` como termo independente. |
| Inconsistência nos cards de topo vs rodapé da tabela | Média | O total da coluna "Extrato OFX (Itaú)" no rodapé exibirá exatamente `formatCurrency(totals.ofxTotal)` (R$ 135.706,55), e os cards do topo continuarão exibindo a segregação canônica: R$ 146.160,23 (positivos) e -R$ 10.453,68 (cheque especial Jabaquara). |
| Regressão em outras telas que chamam a RPC | Baixa | A migration apenas adiciona campos extras no `jsonb_build_object` sem alterar campos existentes, mantendo 100% de retrocompatibilidade. |
