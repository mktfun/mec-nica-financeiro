# Spec Plan: Teste Granular N:1 (Múltiplas Transações de Maquininha/OS -> 1 Único Depósito OFX/PIX) (granular-n-to-one-matching-test)

## Tasks

- [ ] [TEST] Criar script de teste granular `scratch/test_granular_n_to_one.cjs`:
  - [ ] Cenário 1: Injetar 5 mini vendas de Maquininha -> 1 Depósito único no OFX.
  - [ ] Cenário 2: Injetar 4 pagamentos fracionados PIX em OSs -> 1 Depósito único PIX no OFX.
  - [ ] Cenário 3: Injetar 1 OS fracionada em 3 cartões de crédito.
- [ ] [TEST] Executar o script de teste e validar se o motor Subset Sum e a IA em background realizam o pareamento 100% correto.
- [ ] [TEST] Purgar 100% dos dados de teste no Supabase e gerar relatório executivo detalhado.
