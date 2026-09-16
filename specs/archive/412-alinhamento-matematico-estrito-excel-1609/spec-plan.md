# Spec Plan: Alinhamento Matemático Estrito do Fechamento Diário vs Planilha Excel 16/09 (412)

## Tasks

- [ ] [DATABASE] Criar migration com RPC `20260916000002_fix_reconciliation_math_excel_alignment.sql` para tratar o saldo bancário efetivo por loja e deduplicar transações de cartão
- [ ] [DATABASE] Aplicar atualização no banco Supabase corrigindo o saldo da OS 1112 (abate de R$ 3.423,96) e da OS 422 (baixa de R$ 1.349,60)
- [ ] [FRONTEND] Ajustar `CentralImportWizard.tsx` para garantir que o abatimento de pagamentos recebidos por fora (cartão link / PIX) reflita imediatamente no Pátio
- [ ] [FRONTEND] Sincronizar o campo `dinheiro_mp` no fechamento diário com o valor real apurado de R$ 28.316,00
- [ ] [TEST] Executar Cenário 1: Validar que a soma de todas as OSs pendentes no Pátio resulta exatamente em R$ 78.649,98
- [ ] [TEST] Executar Cenário 2: Validar que `get_daily_reconciliation_summary` retorna Caixa Atual = R$ 243.755,67 e Diferença Final = -R$ 2,77
