# Spec Plan: Equalizacao da Conciliacao com a Planilha Oficial (CONCILIACAO 2708.xlsx) (304)

## Tasks

- [ ] [BACKEND] Inserir despesas faltantes em `daily_manual_bills` para 27/08: Prolabore Daniel (R$ 10.000,00) e Seguro Planalto (R$ 284,49) para totalizar R$ 19.535,72
- [ ] [BACKEND] Atualizar snapshot de 27/08 no Supabase para espelhar 100% as células da planilha:
  - `saldo_bancario = 60575.77`
  - `caixa_atual = 154754.18`
  - `contas_a_pagar = 19535.72`
  - `metadata.faturamento_anterior = 867799.24`
  - `metadata.faturamento_oi_base = 23864.38`
  - `metadata.faturamento_periodo = 23864.38`
  - `metadata.fluxo_caixa = 3111.58`
  - `metadata.valor_disp_contas = 20752.80`
  - `metadata.subtotal_contas = 20752.83`
  - `metadata.diferenca_final = -0.03`
  - `metadata.total_saldo_banco = 82615.97`
  - `metadata.saldo_bancos_positivo = 82615.97`
  - `metadata.saldo_negativo_itau = 22040.20`
- [ ] [BACKEND] Atualizar RPC `get_daily_reconciliation_summary` para que `total_saldo_banco_positivo` e o Card de Bancos espelhem `saldo_bancos_positivo` (R$ 82.615,97) conforme G13 da planilha
- [ ] [FRONTEND] Ajustar `ResumoDiaPanel.tsx` para sincronizar os cálculos com a fórmula da planilha (Caixa Atual = R$ 154.754,18, Saldo Bancos = R$ 82.615,97, Faturamento = R$ 23.864,38, Contas = R$ 20.752,83, Diferença = -R$ 0,03)
- [ ] [TEST] Verificar que a RPC para 27/08 retorna todos os números batendo centavo por centavo com a planilha `CONCILIACAO 2708.xlsx`
- [ ] [TEST] Executar `npm run build` com sucesso
