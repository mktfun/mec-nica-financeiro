# Spec Plan: Correção do Saldo de Pátio OS por Filial, Sincronização de Totais e Baixa Granular de Dinheiro por OS (318)

## Tasks

- [x] [BACKEND] Criar migration `20260831000004_fix_patio_os_aggregation_and_cash_vault_baixa.sql` com colunas em `store_cash_vault` e RPC `dar_baixa_dinheiro`
- [x] [BACKEND] Atualizar RPC `get_daily_reconciliation_summary` e `calculate_daily_conciliation` para unificar a leitura canônica de `patio_os` para todas as lojas
- [x] [FRONTEND] Ajustar `StoreOrdensServicoView.tsx` com preview de saldo no formulário manual e sincronização atômica após insert
- [x] [FRONTEND] Atualizar `SaldoBancosDetailModal.tsx` conectando a ação "Dar Baixa" ao modal dedicado `BaixaDinheiroModal.tsx`
- [x] [FRONTEND] Implementar `BaixaDinheiroModal.tsx` em Dark UI com listagem granular de OSs com recebimento em dinheiro e suporte a baixa parcial/total
- [x] [TEST] Executar Cenário 1 (Paridade entre card do header da loja R$ 15.488,57 e tabela de OSs) e verificar via Playwright
- [x] [TEST] Executar Cenário 2 (Baixa granular de dinheiro por OS na filial) e capturar screenshot de validação
