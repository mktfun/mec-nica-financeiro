# Proposal: Teste Matrencial Granular N:M (Múltiplas Mini OSs -> Múltiplas Mini Vendas na Maquininha/OFX) (granular-n-to-m-matrix-matching-test)

## Problema

No cotidiano de oficinas mecânicas de alto movimento, ocorrem casos complexos de matriz N:M onde:
1. **Múltiplas OSs pequenas (N mini OSs)** são pagas em conjunto com **Múltiplas passadas pequenas de cartão (M mini vendas de maquininha)** — ex: 2 OSs (R$ 40,00 + R$ 60,00 = R$ 100,00) pagas por 2 passadas de cartão (R$ 30,00 + R$ 70,00 = R$ 100,00).
2. **OSs com Pagamentos Mistos Centavados:** 1 OS dividida em PIX (R$ 12,34) + Débito (R$ 87,66) pareando com lançamentos de PIX e Maquininha simultaneamente.
3. **Múltiplos Mini PIX de OSs (N PIX OSs) $\leftrightarrow$ Múltiplas Mini Entradas de PIX no Banco (M PIX OFX).**

Precisamos testar essa matriz combinatória N:M completa no algoritmo e no motor de IA em background para garantir zero divergências e zero registros soltos.

## Solução Proposta

1. **Criar Script Especializado Matrencial N:M (`scratch/test_granular_n_to_m.cjs`):**
   - **Cenário 1 (Matriz N:M OS x Maquininha):** 3 Mini OSs (R$ 25,00 + R$ 35,00 + R$ 40,00 = R$ 100,00) batendo com 2 Mini Vendas de Maquininha (R$ 60,00 + R$ 40,00 = R$ 100,00).
   - **Cenário 2 (Pagamento Misto Centavado):** 2 OSs centavadas (OS A: R$ 12,34 PIX + R$ 87,66 Débito = R$ 100,00 | OS B: R$ 45,50 Crédito + R$ 54,50 PIX = R$ 100,00) batendo com os respectivos extratos bancários e maquininha.
   - **Cenário 3 (Matriz N:M PIX OS x PIX OFX):** 3 Mini OSs PIX (R$ 15,00 + R$ 25,00 + R$ 60,00 = R$ 100,00) batendo com 2 lançamentos no extrato OFX (R$ 40,00 + R$ 60,00 = R$ 100,00).

2. **Validação da Lógica Algorítmica + IA:**
   - Testar se a soma dos vetores $N = M$ bate exatamente no Subset Sum.
   - Validar se o motor de IA em background atribui a justificativa de agrupamento com nota $\ge 90\%$.

3. **Auditoria em Relatório Executivo e Limpeza Implacável:**
   - Gravar relatório com a matriz N:M linha por linha.
   - Purgar 100% dos dados de teste no Supabase.

## Contratos de Dados
- Tabelas `transactions`, `patio_os`, `conciliation_matches`, `ai_execution_logs`.

## Risco Principal
Combinatória cruzada de matrizes N:M gerando loops indeterminados no Subset Sum.
*Mitigação:* Usar agrupamento prévio por data/loja e limitar o espaço de busca vetorial para $N, M \le 6$.
