# 📋 Plano de Execução — Spec 476: Calibração de Saídas/Entradas OFX e Saneamento de Contas

## [DB & BACKEND]
- [x] Criar migration `20261003000004_calibracao_saidas_ofx_e_saneamento_contas_loja.sql` com calibração das fórmulas de `dif_saidas`, `status` e `diferenca` na RPC `get_daily_reconciliation_summary`.
- [x] Aplicar migration no Supabase via MCP `apply_migration` ou script de execução segura.
- [x] Executar script de saneamento das 15 observações de OS de 25/08 com `baseline_source = 'historical_patio_carryover'` para eliminar falsos alarmes de pátio antigo.
- [x] Executar auto-match da venda de cartão de R$ 3.490 da Rede com a OS #1849 no Rei do Módulo (`st-09`).
- [x] Testar a RPC `get_daily_reconciliation_summary('2026-08-25')` no terminal e validar que todas as lojas têm `dif_saidas = 0` e `saidas_orfas = 0`.

## [FRONTEND]
- [x] Atualizar `src/components/conciliacao/StoreCardModulo1.tsx` para calibrar os rótulos de saídas (`Sem Débito no Banco` quando `saidasOfxValor === 0 && contasLojaValor > 0`) e cor da barra lateral.
- [x] Executar `npm run build` no terminal para garantir zero regressões de tipagem TypeScript.

## [TESTE & VALIDAÇÃO]
- [x] Verificar a tela de conciliação de lojas para 2026-08-25 garantindo eliminação de falsos alarmes de "Débito Órfão".
- [x] Aplicar Hard Stop para conferência do usuário.
