# Constituição da IA (Rules)

## 1. Tratamento de Dados e Migrations

**Regra:** Expurgo de Legado em Migrations
**Comportamento proibido:** Adicionar colunas restritivas (como `dedup_hash`) ou constraints de unicidade em tabelas críticas (ex: transações financeiras) e deixar os registros antigos preenchidos com `NULL`.
**Guardrail:** Sempre que criar ou modificar schemas de importação envolvendo chaves de des-duplicação, faça um `UPDATE` imediato para preencher retroativamente os hashes usando dados da linha, ou faça um expurgo (`DELETE`) do lixo. Nunca deixe o banco vulnerável a duplicatas em caso de reimportação histórica.
**Por quê universal:** Tabelas com `NULL` em colunas de deduplicação viram uma bomba-relógio em qualquer sistema de importação, permitindo duplicatas ilimitadas de dados antigos se o usuário tentar reprocessar.

## 2. Verifica��o de Tipos em RPCs (Anti-Alucina��o de Schema)

**Regra:** Confirmar tipo de campo antes de criar par�metro de RPC
**Comportamento proibido:** Criar par�metros de fun��o PostgreSQL com tipo assumido (ex: uuid) sem verificar o tipo real da coluna no schema.
**Guardrail:** Antes de criar qualquer RPC com par�metro que mapeia para uma coluna de tabela, executar SELECT data_type FROM information_schema.columns WHERE table_name = ... AND column_name = ... para confirmar o tipo exato. RPCs com tipo errado compilam e retornam 0 linhas silenciosamente � sem erro, sem warning.
**Por qu� universal:** O PostgreSQL faz cast impl�cito em alguns casos, mas n�o em compara��es de filtro (WHERE store_id = p_store_id quando um � text e outro uuid falha silenciosamente). Afeta qualquer projeto Supabase/PostgreSQL independente de stack.

## 3. Leitura de API de Componentes Antes de Usar

**Regra:** Ler a interface real do componente antes de instanciar
**Comportamento proibido:** Usar um componente passando props que n�o existem (ex: className, header manual interno) assumindo analogia com bibliotecas externas como shadcn, MUI ou Radix.
**Guardrail:** Antes de usar qualquer componente existente no projeto, abrir o arquivo fonte e extrair a interface TypeScript de props. Nunca assumir props por analogia com libs externas � o projeto pode ter wrappers com APIs diferentes.
**Por qu� universal:** TypeScript n�o captura props extras em runtime em todos os casos. O componente pode simplesmente ignorar a prop ou quebrar visualmente sem erro no console.

## 4. Cast Nativo no PostgreSQL (Supabase)

**Regra:** Cast Nativo no PostgreSQL (Supabase)
**Comportamento proibido:** Tentar converter parâmetros dinâmicos via `p_date::text` ou usar `TO_CHAR(data, 'YYYY-MM-DD')` para resolver igualdades `=` contra colunas do banco que já são do tipo nativo temporal (`date` ou `timestamp`).
**Guardrail:** Sempre molde o parâmetro/variável para o tipo nativo da coluna alvo (`::date`), garantindo que a comparação seja feita estritamente entre (Data = Data) ou (Timestamp = Timestamp), sob pena do Postgres matar a RPC com `42883 (operator does not exist)`.
**Por quê universal:** A matemática e segurança de tipagem do PostgreSQL falha duramente na nuvem se a query depender de conversões texto implícitas com formatos arbitrários. Isso derruba aplicações em produção não importando o projeto.

## 5. Parser Resiliente de Arquivos Customizados (Excel)

**Regra:** Não confiar em índices fixos ao extrair dados de planilhas customizadas/manuais.
**Comportamento proibido:** Extrair dados de planilhas legadas (ex: conciliação) fixando o index de colunas (`row[6]`) ou forçando chaves `__EMPTY_6` via JSON parser.
**Guardrail:** Em planilhas geradas/editadas por humanos, implemente um parser resiliente que varre as células da linha (Row) através de *fuzzy matching* (includes ou replace) para encontrar o rótulo da variável, e pesque o valor numérico vizinho na mesma linha usando validação forte (`cleanNumber`). 
**Por quê universal:** Arquivos legados ou criados manualmente no Excel ou planilhas do Google invariavelmente sofrerão com mesclagens de colunas, espaços em branco invisíveis e quebras de codificação (ex: UTF-8 vs Latin-1). Depender de um grid posicional fixo é receita infalível para quebrar integrações financeiras quando a planilha sofrer a mínima alteração estética.
