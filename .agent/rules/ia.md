# ConstituiÃ§Ã£o da IA (Rules)

## 1. Tratamento de Dados e Migrations

**Regra:** Expurgo de Legado em Migrations
**Comportamento proibido:** Adicionar colunas restritivas (como `dedup_hash`) ou constraints de unicidade em tabelas crÃ­ticas (ex: transaÃ§Ãµes financeiras) e deixar os registros antigos preenchidos com `NULL`.
**Guardrail:** Sempre que criar ou modificar schemas de importaÃ§Ã£o envolvendo chaves de des-duplicaÃ§Ã£o, faÃ§a um `UPDATE` imediato para preencher retroativamente os hashes usando dados da linha, ou faÃ§a um expurgo (`DELETE`) do lixo. Nunca deixe o banco vulnerÃ¡vel a duplicatas em caso de reimportaÃ§Ã£o histÃ³rica.
**Por quÃª universal:** Tabelas com `NULL` em colunas de deduplicaÃ§Ã£o viram uma bomba-relÃ³gio em qualquer sistema de importaÃ§Ã£o, permitindo duplicatas ilimitadas de dados antigos se o usuÃ¡rio tentar reprocessar.

## 2. Verificação de Tipos em RPCs (Anti-Alucinação de Schema)

**Regra:** Confirmar tipo de campo antes de criar parâmetro de RPC
**Comportamento proibido:** Criar parâmetros de função PostgreSQL com tipo assumido (ex: uuid) sem verificar o tipo real da coluna no schema.
**Guardrail:** Antes de criar qualquer RPC com parâmetro que mapeia para uma coluna de tabela, executar SELECT data_type FROM information_schema.columns WHERE table_name = ... AND column_name = ... para confirmar o tipo exato. RPCs com tipo errado compilam e retornam 0 linhas silenciosamente — sem erro, sem warning.
**Por quê universal:** O PostgreSQL faz cast implícito em alguns casos, mas não em comparações de filtro (WHERE store_id = p_store_id quando um é text e outro uuid falha silenciosamente). Afeta qualquer projeto Supabase/PostgreSQL independente de stack.

## 3. Leitura de API de Componentes Antes de Usar

**Regra:** Ler a interface real do componente antes de instanciar
**Comportamento proibido:** Usar um componente passando props que não existem (ex: className, header manual interno) assumindo analogia com bibliotecas externas como shadcn, MUI ou Radix.
**Guardrail:** Antes de usar qualquer componente existente no projeto, abrir o arquivo fonte e extrair a interface TypeScript de props. Nunca assumir props por analogia com libs externas — o projeto pode ter wrappers com APIs diferentes.
**Por quê universal:** TypeScript não captura props extras em runtime em todos os casos. O componente pode simplesmente ignorar a prop ou quebrar visualmente sem erro no console.

## 4. Cast Nativo no PostgreSQL (Supabase)

**Regra:** Cast Nativo no PostgreSQL (Supabase)
**Comportamento proibido:** Tentar converter parÃ¢metros dinÃ¢micos via `p_date::text` ou usar `TO_CHAR(data, 'YYYY-MM-DD')` para resolver igualdades `=` contra colunas do banco que jÃ¡ sÃ£o do tipo nativo temporal (`date` ou `timestamp`).
**Guardrail:** Sempre molde o parÃ¢metro/variÃ¡vel para o tipo nativo da coluna alvo (`::date`), garantindo que a comparaÃ§Ã£o seja feita estritamente entre (Data = Data) ou (Timestamp = Timestamp), sob pena do Postgres matar a RPC com `42883 (operator does not exist)`.
**Por quÃª universal:** A matemÃ¡tica e seguranÃ§a de tipagem do PostgreSQL falha duramente na nuvem se a query depender de conversÃµes texto implÃ­citas com formatos arbitrÃ¡rios. Isso derruba aplicaÃ§Ãµes em produÃ§Ã£o nÃ£o importando o projeto.

## 5. Parser Resiliente de Arquivos Customizados (Excel)

**Regra:** NÃ£o confiar em Ã­ndices fixos ao extrair dados de planilhas customizadas/manuais.
**Comportamento proibido:** Extrair dados de planilhas legadas (ex: conciliaÃ§Ã£o) fixando o index de colunas (`row[6]`) ou forÃ§ando chaves `__EMPTY_6` via JSON parser.
**Guardrail:** Em planilhas geradas/editadas por humanos, implemente um parser resiliente que varre as cÃ©lulas da linha (Row) atravÃ©s de *fuzzy matching* (includes ou replace) para encontrar o rÃ³tulo da variÃ¡vel, e pesque o valor numÃ©rico vizinho na mesma linha usando validaÃ§Ã£o forte (`cleanNumber`). 
**Por quÃª universal:** Arquivos legados ou criados manualmente no Excel ou planilhas do Google invariavelmente sofrerÃ£o com mesclagens de colunas, espaÃ§os em branco invisÃ­veis e quebras de codificaÃ§Ã£o (ex: UTF-8 vs Latin-1). Depender de um grid posicional fixo Ã© receita infalÃ­vel para quebrar integraÃ§Ãµes financeiras quando a planilha sofrer a mÃ­nima alteraÃ§Ã£o estÃ©tica.
  
## 6. Vite Build / Typechecking Fallacy

**Regra:** O comando `npm run build` do Vite não roda typechecking por padrão.
**Comportamento proibido:** Confiar que um build bem-sucedido via Vite/esbuild atesta a ausência de erros de tipagem ou referência (`ReferenceError`) após criar, renomear ou excluir estados/variáveis.
**Guardrail:** NUNCA assuma que um build bem-sucedido garante código seguro se você alterou variáveis. Se criar ou renomear estados React em um projeto Vite, verifique a declaração lendo o arquivo minuciosamente ou force a verificação de tipos (`npx tsc --noEmit`) antes de concluir a task. Vite apenas transpila o código e vai mascarar `ReferenceError` fatais até o runtime.
**Por quê universal:** Vite é o padrão na maioria dos projetos React modernos. Renomear uma variável e receber um "build successful" cria uma falsa sensação de segurança e gera bugs em produção invisíveis na compilação.
