# Design: Teste Matrencial Granular N:M (Múltiplas Mini OSs -> Múltiplas Mini Vendas na Maquininha/OFX) (granular-n-to-m-matrix-matching-test)

## Arquitetura de Batimento da Matriz N:M

```
[N Mini OSs (Faturamento)]                [M Mini Vendas Maquininha / PIX]
  - OS #101: R$ 25,00                       - Venda Rede A: R$ 60,00
  - OS #102: R$ 35,00                       - Venda Rede B: R$ 40,00
  - OS #103: R$ 40,00
  ---------------------                     ----------------------------
  TOTAL N = R$ 100,00        <===========>  TOTAL M = R$ 100,00
```

## Casos de Teste Matrenciais N:M

1. **Cenário 1 (3 Mini OSs x 2 Mini Vendas Maquininha):**
   - OSs: R$ 25,00 + R$ 35,00 + R$ 40,00 = R$ 100,00.
   - Vendas Maquininha: R$ 60,00 + R$ 40,00 = R$ 100,00.
   - Validação: Soma das N OSs = Soma das M Vendas da Maquininha.

2. **Cenário 2 (Pagamento Misto Centavado PIX + Cartão):**
   - OS A: R$ 12,34 (PIX) + R$ 87,66 (Débito) = R$ 100,00.
   - OS B: R$ 45,50 (Crédito) + R$ 54,50 (PIX) = R$ 100,00.
   - Validação: Agrupamento cruzado dos centavos exatos nos extratos bancários e maquininha.

3. **Cenário 3 (3 Mini OSs PIX x 2 Lançamentos PIX OFX):**
   - OSs PIX: R$ 15,00 + R$ 25,00 + R$ 60,00 = R$ 100,00.
   - Extrato OFX PIX: R$ 40,00 + R$ 60,00 = R$ 100,00.
   - Validação: Consolidação da matriz de transferência bancária N:M.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Igualdade Vetorial N = M):**
  - *Ação:* Comparar a soma da coleção de OSs N contra a soma da coleção de Vendas M.
  - *Resultado Esperado:* $\sum N = \sum M$, resultando em Delta = 0 e status PAREADO.
- **Cenário 2 (Purga Geral do Banco):**
  - *Ação:* Concluir os testes e executar a rotina de limpeza.
  - *Resultado Esperado:* O Supabase retorna a 0 registros em todas as tabelas.
