# Proposal: Teste Granular N:1 (Múltiplas Transações de Maquininha/OS -> 1 Único Depósito OFX/PIX) (granular-n-to-one-matching-test)

## Problema

No dia a dia de uma oficina mecânica, é extremamente comum que:
1. **Várias pequenas vendas de Maquininha (N transações de cartÁo)** sejam liquidadas pela credenciadora (Rede) em um **único lote de depósito bancário no OFX (1 transaçÁo no banco)**.
2. **Múltiplos pagamentos fracionados de OSs (N mini transações)** correspondam a um **único PIX ou recebimento agrupado no Banco**.

Precisamos garantir e testar exaustivamente se o algoritmo Subset Sum (Camada 2 / Camada 3) e o motor de IA em background conseguem somar com precisÁo cirúrgica os N lançamentos fracionados e pareá-los com o depósito único no OFX/PIX, registrando a telemetria e o raciocínio sem deixar pontas soltas.

## SoluçÁo Proposta

1. **CriaçÁo de um Script Especializado de Testes Granulares N:1 (`scratch/test_granular_n_to_one.cjs`):**
   - Injetar cenários reais complexos:
     - **Cenário N:1 Maquininha -> OFX:** 5 vendas de cartÁo (ex: R$ 15,50 + R$ 24,50 + R$ 40,00 + R$ 10,00 + R$ 10,00 = R$ 100,00 Bruto / R$ 95,00 Líquido após MDR de R$ 5,00) pareando com **1 único crédito bancário de R$ 95,00**.
     - **Cenário N:1 OS PIX -> OFX:** 4 pagamentos fracionados de OS (ex: R$ 30,00 + R$ 45,00 + R$ 25,00 + R$ 50,00 = R$ 150,00) pareando com **1 único PIX de R$ 150,00** no extrato.
     - **Cenário 1:N OS -> Várias Maquininhas:** 1 OS de R$ 500,00 paga em 3 cartões fracionados (R$ 200,00 + R$ 200,00 + R$ 100,00).

2. **ExecuçÁo do Algoritmo & Motor de IA:**
   - Executar o motor de pareamento (`findExactSubsetMatch` e `generateTripleMatchSuggestions`).
   - Validar se o algoritmo resolve pelo Subset Sum (Camada 2/3) ou se a IA em background intervém registrando o raciocínio e o score de confiança em `ai_execution_logs`.

3. **Auditoria em Relatório Executivo e Limpeza Implacável:**
   - Emitir o relatório detalhado comprovando que todas as somas bateram ao centavo.
   - Purgar 100% dos dados de teste no Supabase ao término da verificaçÁo.

## Contratos de Dados
- Tabelas `transactions`, `patio_os`, `conciliation_matches`, `ai_execution_logs`.

## Features Existentes Impactadas
- `src/hooks/useConciliacao.ts` (funçÁo `findExactSubsetMatch`)
- `src/lib/llm-matcher.ts` (suporte a combinações N:1)

## Risco Principal
Combinatória exponencial no Subset Sum em lotes muito grandes de transações.
*MitigaçÁo:* Manter a janela de combinaçÁo em profundidade máxima $\le 6$ itens e delegar conjuntos superiores para o motor de IA em background.
