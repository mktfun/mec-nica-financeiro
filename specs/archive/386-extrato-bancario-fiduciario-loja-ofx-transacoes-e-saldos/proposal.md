# Proposal: Extrato Bancário Fiduciário Completo da Filial (OFX Transações e Saldos) (386)

## Problema
1. **Ocultação de Lançamentos do Extrato Bancário na Tela da Loja:**
   - Na tela de conciliação por loja (`/conciliacao/:lojaId?date=2026-09-09`), aba **"2. Extrato Bancário (OFX & PIX)"** (`StoreExtratoBancarioView.tsx`), a listagem consome `useTransactionsPorDataELoja(date, storeId)` com filtro estrito `.eq('target_date', date)`.
   - No caso de 09/09/2026 para Planalto (e outras filiais), o extrato bancário oficial do Itaú (`brasicar.ofx`) continha 14 movimentações bancárias reais (cobrindo 05/09 a 09/09), mas a tela exibiu apenas 3 lançamentos de 09/09, ocultando os outros 11 lançamentos que vieram no mesmo arquivo de extrato.
2. **Ausência da Equação Fiduciária de Saldos (Saldo Inicial, Movimentação e Saldo Final `<LEDGERBAL>`):**
   - Os cards de topo exibem apenas `Total Entradas (+R$ 5.490,07)`, `Total Saídas (-R$ 3.000,00)`, `Movimentação Líquida (+R$ 2.490,07)` e `Status`.
   - **Não há menção ao Saldo Anterior (+R$ 412,78)** nem ao **Saldo Final Oficial do Banco (`<LEDGERBAL>`: -R$ 5.659,95)**.
   - O operador vê uma movimentação positiva de +R$ 2.490,07 e não consegue entender por que a conta está negativa em -R$ 5.659,95 no banco e no fechamento.
3. **Falta de Linhas Marcadoras de Extrato Real:**
   - O usuário precisa ver na tabela a estrutura idêntica ao extrato impresso do banco (como demonstrado nas imagens enviadas):
     - Linha inicial: **Saldo Anterior**
     - Transações diárias discriminadas (boletos, PIXs, tarifas, recebimentos)
     - Marcador de saldo do dia anterior
     - Linha final: **Saldo Final Oficial (`<LEDGERBAL>`)**

## Solução Proposta (Foco em Reuso e Não-Duplicação)
1. **[EXTEND] `src/hooks/useTransactions.ts`:**
   - Criar hook `useStoreExtratoBancario(storeId, date)`:
     - Buscar tanto as transações contábeis do dia alvo quanto as transações do lote de extrato OFX importado (`import_batch_id` correspondente ou janela do extrato recente).
     - Consultar `reconciliations` da loja para resgatar `previous_balance` e `bank_total` (`<LEDGERBAL>`).
2. **[MODIFY] `src/components/conciliacao/StoreExtratoBancarioView.tsx`:**
   - **Hero Cards de Reconciliação Bancária:**
     - Card 1: Saldo Anterior do Extrato (`previous_balance`, ex: +R$ 412,78 ou saldo de D-1)
     - Card 2: Total Entradas / Créditos (+R$ 5.490,07)
     - Card 3: Total Saídas / Débitos (-R$ 3.000,00)
     - Card 4: Movimentação Líquida do Período (+R$ 2.490,07)
     - Card 5 (Destaque): Saldo Final Bancário Oficial (`<LEDGERBAL>`: -R$ 5.659,95) com selo de validação bancária Itaú.
   - **Seletor de Modo de Visualização (Segmented Control):**
     - `[📄 Extrato Completo do Arquivo OFX]` (exibe todas as 14 transações do extrato, igual às fotos 1 e 2)
     - `[🎯 Apenas Fechamento do Dia (09/09)]` (foco nos lançamentos da data contábil do fechamento)
   - **Tabela com Padrão de Extrato Bancário Real:**
     - Linha de cabeçalho: **"SALDO ANTERIOR"** com data inicial e valor formatado.
     - Linhas de transações com descrição completa (favorecido, CNPJ/CPF, número de documento sem truncamento agressivo).
     - Marcadores informativos de saldo diário quando houver transições de data.
     - Linha de rodapé: **"SALDO FINAL CONTA CORRENTE (<LEDGERBAL>)"** em 09/09/2026.

## Investigação e Análise de Reuso (Dados Existentes)
- **Tabelas / Views Existentes:**
  - `transactions`: Já contém todas as 14 transações cadastradas com `store_id = 'st-06'` e `import_batch_id = '576bd987-5149-4fb1-b6a1-287094413228'`.
  - `reconciliations`: Já contém `previous_balance = 412.78` e `bank_total = -5659.95` para `(store_id = 'st-06', date = '2026-09-09')`.
- **Componentes / Hooks Existentes:**
  - `StoreExtratoBancarioView.tsx` já possui a tabela em Dark UI Zinc-950, modais de justificativa (`OrphanCategorizationModal`) e vínculo manual (`ManualMatchOsModal`).
  - Nenhum componente ou tabela nova precisa ser criado; apenas estendemos o hook de consulta e a renderização do extrato.

## Contratos de Dados & SQL (Supabase)
- Nenhuma alteração DDL ou migration nova necessária.
- Reuso de consultas existentes em `transactions` e `reconciliations`.

## Risco Principal e Mitigação
- **Risco:** Misturar transações de dias anteriores com o cálculo contábil do fechamento diário de 09/09.
- **Mitigação:** Manter o seletor claro entre `Extrato Completo do OFX` (visão de extrato) e `Apenas Fechamento do Dia` (visão de conciliação do dia), garantindo que os KPIs de fechamento continuem respeitando a `target_date`.
