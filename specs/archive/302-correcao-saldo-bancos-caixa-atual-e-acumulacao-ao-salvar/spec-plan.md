# Spec Plan: Correcao do Saldo Bancos, Caixa Atual e Acumulacao ao Salvar (302)

## Tasks

- [x] [BACKEND] Atualizar RPC `get_daily_reconciliation_summary` - Ramal 1: recalcular `saldo_bancos_positivo` e `saldo_negativo_itau` buscando dos `reconciliations` (DISTINCT ON store_id, date <= target_date), nao do snapshot.saldo_bancario
- [x] [BACKEND] Hotfix de dados: corrigir snapshot de 27/08 no Supabase (saldo_bancario = 60575.77, caixa_atual = 163755.56, metadata atualizado)
- [x] [FRONTEND] Corrigir `caixaAtualCalculado` em `ResumoDiaPanel.tsx` linha 152-154 para subtrair `saldoNegativoItau`
- [x] [FRONTEND] Corrigir `handleSave` em `ResumoDiaPanel.tsx`: gravar `saldo_bancario: summary?.saldo_bancos_ofx` (OFX liquido puro) em vez de `saldoBancosValor` (que inclui cofre+rede)
- [x] [TEST] Verificar que a RPC para 26/08 (dia fechado e correto) continua retornando caixa_atual = R$ 151.642,60
- [x] [TEST] Verificar que a RPC para 27/08 apos hotfix retorna: saldo_bancos_positivo = R$ 82.615,97, saldo_negativo_itau = R$ 22.040,20, total_saldo_banco_positivo = R$ 91.617,38, caixa_atual = R$ 163.755,56
- [x] [TEST] Verificar que o Card "Saldo Bancos + Dinheiro" exibe R$ 91.617,38
- [x] [TEST] Verificar que o Caixa Atual exibe R$ 163.755,56
- [x] [TEST] Clicar em "Salvar" novamente e verificar que os valores NAO se acumulam (idempotencia de save)
- [x] [TEST] Executar `npm run build` sem erros de tipagem
