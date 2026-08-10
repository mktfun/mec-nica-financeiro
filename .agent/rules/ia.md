# Constitui√ß√£o da IA (Rules)

## 1. Tratamento de Dados e Migrations

**Regra:** Expurgo de Legado em Migrations
**Comportamento proibido:** Adicionar colunas restritivas (como `dedup_hash`) ou constraints de unicidade em tabelas cr√≠ticas (ex: transa√ß√µes financeiras) e deixar os registros antigos preenchidos com `NULL`.
**Guardrail:** Sempre que criar ou modificar schemas de importa√ß√£o envolvendo chaves de des-duplica√ß√£o, fa√ßa um `UPDATE` imediato para preencher retroativamente os hashes usando dados da linha, ou fa√ßa um expurgo (`DELETE`) do lixo. Nunca deixe o banco vulner√°vel a duplicatas em caso de reimporta√ß√£o hist√≥rica.
**Por qu√™ universal:** Tabelas com `NULL` em colunas de deduplica√ß√£o viram uma bomba-rel√≥gio em qualquer sistema de importa√ß√£o, permitindo duplicatas ilimitadas de dados antigos se o usu√°rio tentar reprocessar.

## 2. VerificaÁ„o de Tipos em RPCs (Anti-AlucinaÁ„o de Schema)

**Regra:** Confirmar tipo de campo antes de criar par‚metro de RPC
**Comportamento proibido:** Criar par‚metros de funÁ„o PostgreSQL com tipo assumido (ex: uuid) sem verificar o tipo real da coluna no schema.
**Guardrail:** Antes de criar qualquer RPC com par‚metro que mapeia para uma coluna de tabela, executar SELECT data_type FROM information_schema.columns WHERE table_name = ... AND column_name = ... para confirmar o tipo exato. RPCs com tipo errado compilam e retornam 0 linhas silenciosamente ó sem erro, sem warning.
**Por quÍ universal:** O PostgreSQL faz cast implÌcito em alguns casos, mas n„o em comparaÁıes de filtro (WHERE store_id = p_store_id quando um È text e outro uuid falha silenciosamente). Afeta qualquer projeto Supabase/PostgreSQL independente de stack.

## 3. Leitura de API de Componentes Antes de Usar

**Regra:** Ler a interface real do componente antes de instanciar
**Comportamento proibido:** Usar um componente passando props que n„o existem (ex: className, header manual interno) assumindo analogia com bibliotecas externas como shadcn, MUI ou Radix.
**Guardrail:** Antes de usar qualquer componente existente no projeto, abrir o arquivo fonte e extrair a interface TypeScript de props. Nunca assumir props por analogia com libs externas ó o projeto pode ter wrappers com APIs diferentes.
**Por quÍ universal:** TypeScript n„o captura props extras em runtime em todos os casos. O componente pode simplesmente ignorar a prop ou quebrar visualmente sem erro no console.
