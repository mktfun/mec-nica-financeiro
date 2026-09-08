# Proposal: Diagnóstico Forense e Resolução Automática de Saídas e Entradas Órfãs (375)

## 1. Problema
Ao importar os arquivos reais de conciliação de `08/09/2026` (`C:\Users\admin\Desktop\conciliacao\09-26\08-09`), o operador deparou-se com uma explosão inexplicável de transações sem correspondência:
- **Saídas Órfãs: 20**
- **Entradas Órfãs: 6**

A análise forense profunda dos dados brutos dos 10 arquivos OFX, de `BuscaContasAPagar.xls` e das 69 Ordens de Serviço revelou com precisão cirúrgica por que essa explosão ocorreu:
1. **Lotes de Salários SISPAG (8 débitos bancários = 23 colaboradores)**: O Itaú debita a folha de pagamento como um **débito único consolidado** por filial (ex.: `SISPAG SALARIOS R$ 5.053,00` em Rudge Ramos, `R$ 4.753,00` em Piraporinha, `R$ 6.061,13` em Santo André, `R$ 7.851,00` em Kennedy, `R$ 4.477,44` em Jabaquara, `R$ 2.960,61` em Jorge Beretta, `R$ 2.213,00` em Planalto, `R$ 680,48` em Dom Pedro). Porém, no ERP (`BuscaContasAPagar.xls`), cada colaborador possui um título individual. Como o motor de matching só suportava comparação 1-para-1 (`ABS(amount - txAmount) <= 0.05`), **nenhum lote SISPAG foi casado**, gerando 8 saídas órfãs gigantes e deixando 23 salários abertos no ERP.
2. **Transferências Intercompany entre Filiais (3 pares = 6 órfãos)**: Três movimentações foram transferências diretas entre contas do grupo (Piraporinha enviou R$ 6.000 para Planalto; Kennedy enviou R$ 4.000 para Mauá; Kennedy enviou R$ 4.000 para Santo André). O sistema tratou cada perna isoladamente, gerando 3 saídas órfãs no remetente e 3 entradas órfãs no destinatário (6 itens na fila manual).
3. **Saques em Dinheiro / ATM (7 débitos = R$ 9.500)**: 7 débitos correspondem a saques em espécie em terminal (`SAQUE DIN ATM CART001008`) em Mauá (3x R$ 1.500) e Planalto (3x R$ 1.500 + 1x R$ 500). Como não possuem duplicata no ERP, caíram como saídas órfãs e, pior, o classificador heurístico sugeriu `"Peças / Fornecedor Avulso"` com `adicionaNoContas: true`, ameaçando inflar indevidamente o Contas a Pagar.
4. **Bloqueio e Desbloqueio PIX de Segurança (1 débito + 1 crédito = R$ 900)**: No Rei do Módulo (`8813_992677`), houve um débito `BLOQUEIO PIX` de R$ 900 e um crédito `DESBLOQUEIO PIX` de R$ 900. Ambos caíram na fila de órfãos, apesar de terem efeito financeiro líquido zero na mesma conta.
5. **Bug de Conversão de Datas Seriais do Excel em `contasPagarParser.ts`**: Colunas de data como `Dt. Pgto` e `Dt. Vecto` contendo números de série do Excel (ex: `46269` para `04/09/2026` e `46270` para `05/09/2026`) falhavam no regex `\d{4}-\d{2}-\d{2}` e retornavam `undefined`, forçando o fallback para a data de hoje (`new Date().toISOString()`), desincronizando os filtros de data das queries.

## 2. Solução Proposta
Implementar uma reformulação estruturada do pipeline de matching e classificação tanto no frontend (`expenseMatcher.ts`, `contasPagarParser.ts`, `Step2NonRevenueJustifications.tsx`) quanto no backend (`public.auto_match_saidas`):
1. **Suporte a Datas Seriais do Excel em `contasPagarParser.ts`**: Utilizar `XLSX.SSF.parse_date_code` para converter inteiros seriais do Excel em strings `YYYY-MM-DD`, garantindo que as datas reais (`2026-09-04` e `2026-09-05`) sejam preservadas na ingestão.
2. **Motor de Batimento 1-para-N para Lotes SISPAG Salários**:
   - Identificar débitos OFX com padrão `SISPAG|SALARIO`.
   - Somar os títulos em aberto de salários (`category = 'retirada_socios'` ou descrição com `SALARIO`) da mesma filial (e holding/master se houver rateio).
   - Se a soma dos títulos bater com o débito com tolerância de até R$ 0,10, vincular em lote: cada título marca `matched_ofx_id = ofx.id` e o débito OFX marca `matched_bill_id = 'BATCH_SISPAG'` e `match_status = 'matched_batch'`.
   - Redução imediata: **-8 saídas órfãs** e **23 títulos de salário baixados automaticamente**.
3. **Pareamento Determinístico Intercompany (Transferências entre Lojas)**:
   - Detectar pares espelhados na mesma sessão/data: Débito em Loja A de R$ X com menção a Loja B + Crédito em Loja B de R$ X com menção a Loja A.
   - Auto-justificar ambas as pontas como `Transferência Entre Lojas [Apenas Conciliar]` com `contabilizar_no_subtotal = false` e `impactsRevenue = false`.
   - Redução imediata: **-3 saídas órfãs** e **-3 entradas órfãs**.
4. **Auto-Cancelamento de Bloqueio/Desbloqueio PIX**:
   - Detectar débito `BLOQUEIO PIX` e crédito `DESBLOQUEIO PIX` de mesmo valor na mesma conta.
   - Auto-justificar ambos como `Estorno / Ajuste [Apenas Conciliar]`.
   - Redução imediata: **-1 saída órfã** e **-1 entrada órfã**.
5. **Classificação Blindada de Saques ATM**:
   - Expandir `inferOutflowCategory` para detectar `SAQUE DIN|SAQUE ATM|CART00`.
   - Atribuir categoria `Retirada de Sócios / Sangria / Saque em Dinheiro` com `adicionaNoContas: false`.
   - Não gerar falsos títulos de fornecedores avulsos no ERP.

**Resultado Esperado nos Arquivos de 08/09/2026**:
- Saídas Órfãs caem de **20 para 8** (sendo 7 saques ATM pré-configurados sem inflar contas + 1 débito seguro R$ 87,84).
- Entradas Órfãs caem de **6 para 2** (apenas os 2 PIXs de clientes finais Sara Sales R$ 3.500 e Tania Borali R$ 1.640,30, que legitimamente necessitam de confirmação de OS).

## 3. Contratos de Dados

### Atualização das Estruturas e Colunas
- `ofx_transactions.match_status`: Suporte aos valores `'matched'`, `'matched_batch'`, `'intercompany_paired'`, `'auto_cancelled'`.
- `daily_manual_bills.matched_ofx_id`: Armazena o ID da transação OFX debitada, inclusive em lotes SISPAG (múltiplos bills com o mesmo `matched_ofx_id`).
- Payload de Pareamento em Lote:
```typescript
export interface SispagBatchMatch {
  ofxDebitId: string;
  storeId: string;
  totalDebitAmount: number;
  matchedBillIds: string[];
  totalBillsAmount: number;
  divergence: number;
}
```

## 4. Arquivos Afetados

### [Arquivos Existentes Modificados]
- `src/lib/parsers/contasPagarParser.ts`: Correção do parser de datas para aceitar números de série do Excel (`46269` -> `2026-09-04`).
- `src/lib/expenseMatcher.ts`: Adição da Camada de Match 1-para-N (SISPAG) e Pareamento Intercompany em memória.
- `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`: Suporte à exibição de matches automáticos de transferência e regex de saques ATM (`SAQUE DIN ATM CART001008`).
- `supabase/migrations/20260908000035_batch_sispag_and_intercompany_matching.sql`: Atualização da RPC `public.auto_match_saidas` para executar resolução de lotes SISPAG e pareamento intercompany no PostgreSQL.

### [Arquivos Novos]
- Nenhum arquivo novo de infraestrutura (reutilização estrita de componentes e tabelas existentes).

## 5. Plano de Rollback
1. Caso o matching em lote SISPAG vincule títulos indevidos, basta reverter a migration executando a versão anterior de `auto_match_saidas` (`20260905000033_strict_store_by_store_auto_match_saidas.sql`).
2. As alterações no parser TypeScript são puramente funcionais e podem ser revertidas via `git checkout` sem efeitos colaterais em dados persistidos.

## 6. Risco Principal e Mitigação
- **Risco**: Uma soma de títulos coincidir fortuitamente com o valor de um débito SISPAG em filiais com muitos funcionários.
- **Mitigação**: O match SISPAG só é autorizado se:
  1. O memo bancário contiver expressamente `SISPAG` ou `SALARIO`.
  2. Todos os títulos somados pertencerem à categoria de folha/salários (`category = 'retirada_socios'` ou descrição contendo `SALARIO`).
  3. A filial for estritamente a mesma (ou holding explicitamente vinculada àquela filial).
