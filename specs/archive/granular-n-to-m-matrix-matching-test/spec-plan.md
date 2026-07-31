# Spec Plan: Teste Matrencial Granular N:M (Múltiplas Mini OSs -> Múltiplas Mini Vendas na Maquininha/OFX) (granular-n-to-m-matrix-matching-test)

## Tasks

- [ ] [TEST] Criar script de teste matrencial `scratch/test_granular_n_to_m.cjs`:
  - [ ] Cenário 1: 3 Mini OSs (R$ 25 + R$ 35 + R$ 40) x 2 Mini Maquininhas (R$ 60 + R$ 40).
  - [ ] Cenário 2: Pagamentos Mistos Centavados (R$ 12,34 PIX + R$ 87,66 Débito / R$ 45,50 Crédito + R$ 54,50 PIX).
  - [ ] Cenário 3: 3 Mini OSs PIX (R$ 15 + R$ 25 + R$ 60) x 2 Lançamentos PIX OFX (R$ 40 + R$ 60).
- [ ] [TEST] Executar o script de teste e validar se o batimento matrencial N:M é concluído com Delta = R$ 0,00.
- [ ] [TEST] Purgar 100% dos dados de teste no Supabase e emitir relatório executivo final.
