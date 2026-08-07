# Design: Correção Matemática do Dashboard (115)

## 1. Banco de Dados (RPC \get_dashboard_metrics\)
A query que calcula _na_loja no RPC será substituída para aplicar a lógica de carry-over histórico:

`sql
    -- Na loja = soma do historico na_loja_os ou fallback para patio_os
    SELECT COALESCE(SUM(n_loja), 0) INTO v_na_loja
    FROM (
        SELECT store_id, (
            SELECT COALESCE(na_loja_os, (
                SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0)
                FROM patio_os p WHERE p.store_id = stores.id AND p.status IN ('em_aberto', 'pago_parcial')
            ))
            FROM reconciliations r2
            WHERE r2.store_id = stores.id AND r2.date <= p_date
            ORDER BY r2.date DESC LIMIT 1
        ) as n_loja FROM stores
    ) sub;
`
Isso resolverá a discrepância onde a interface exibe ~18k ao invés de resgatar o passivo (dívida legada) herdado pelo fluxo de caixa, que chega aos 53k relatados.

## 2. Componente React (\src/components/conciliacao/ResumoDiaPanel.tsx\)
Modificar a UI para somar Despesas do OFX (Contas Pagas) com Taxas/Juros, resolvendo a ausência visual dos 1018 reais da conta OFX:

**De:**
`	sx
  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">TAXAS/JUROS</span>
  ...
  <AnimatedNumber value={inputForCalculation.juros_rede} format="currency" />
`

**Para:**
`	sx
  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">DESPESAS / JUROS</span>
  ...
  <AnimatedNumber value={inputForCalculation.juros_rede + contasAPagarAutomatico} format="currency" />
  <span className="text-[10px] text-[var(--text-tertiary)] block">OFX Out + Maquininha</span>
`
A propriedade contasAPagarAutomatico já mapeia exatamente o Math.abs(totalOfxOut), portanto a matemática bruta da classe já está certa, o problema era apenas omitir as despesas no bloco visual principal.
