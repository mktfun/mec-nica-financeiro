# Tasks: ConciliaçÁo Bancária & Juros da Rede (030)

## Backend (Supabase & SQL)
- [x] Criar nova migraçÁo Supabase: `npx supabase migration new add_bank_reconciliation_fields`.
- [x] No arquivo de migraçÁo, adicionar à tabela `reconciliations` as colunas `ofx_imported` (BOOLEAN DEFAULT FALSE), `bank_divergence` (NUMERIC DEFAULT 0), e `machine_fees` (NUMERIC DEFAULT 0).
- [x] Aplicar a migraçÁo e atualizar as tipagens Typescript (rodando o gerador do Supabase `npx supabase gen types ...`).
- [x] Criar / Atualizar hook `useSaveBankReconciliation` no arquivo `src/hooks/useConciliacao.ts` para realizar o UPSERT com os resultados validados do Extrato e do Custo de Juros.

## Engine & Parsers (Typescript)
- [x] Criar arquivo de utilidade `src/lib/ofxParser.ts` capaz de extrair `<STMTTRN>`, `<TRNTYPE>`, `<TRNAMT>`, `<DTPOSTED>` e `<MEMO>` usando Regex leve e nativo do JS.
- [x] Construir funçÁo `matchTransactions(ofx, system, tolerance = 10)` no `ofxParser` que devolve os pares { `matched`, `unmatchedOfx`, `unmatchedSystem` }.
- [x] Criar funçÁo parser no arquivo apropriado para a planilha de Juros: Ler arquivo XLSX de Juros da Rede, identificar a Loja por string-matching em blocos e extrair o `valor cobrado` total.

## Frontend (Componentes UI/UX)
- [x] Em `src/routes/conciliacao.tsx` (ou nova rota `conciliacao-bancaria.tsx`, se ficar muito denso), criar o cabeçalho "Fechamento Bancário (OFX)" ao lado do "Importar Maquininha".
- [x] Criar Dropzone / Input duplo para "Extrato Bancário (.ofx)" e "Custos/Juros (.xlsx)".
- [x] Implementar Modal "Loja Desconhecida no Banco" caso o OFX lido (`Extrato_JAB`) nÁo seja auto-mapeado com as Lojas do banco localmente (similar ao feito na importaçÁo da maquininha).
- [x] Renderizar o `<BankReconciliationDashboard />`: 
  - Painel com os Totais processados.
  - Tabela Central lado-a-lado ou 2 colunas com o resultado do match (`Transações Encontradas com Sucesso`).
  - Painel Vermelho abaixo exibindo as Anomalias (`Incongruências do Banco` e `Lançamentos NÁo Constam no Extrato`).
- [x] Inserir botÁo "Salvar ConciliaçÁo" que fecha o fluxo, invoca `useSaveBankReconciliation` e altera o fundo para um Neon Verde de Sucesso.

## QA e Estética
- [x] Aplicar estilo Liquid Glass / Cores Neon (Verde para sucesso, Vermelho vivo para erro/incongruência) baseados no `ux-ui-architect-2026`.
- [x] Validar parsing usando os arquivos passados de exemplo (`Extrato_JAB.ofx` e `JUROS REDE.xlsx`).
- [x] Garantir que o DRE / Dashboard do dia leve em conta o valor retido das maquininhas (`machine_fees`) para mostrar o "Lucro Real" da operaçÁo.
