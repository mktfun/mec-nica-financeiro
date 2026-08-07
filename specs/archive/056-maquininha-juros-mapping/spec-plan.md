# Spec Plan: Maquininha and Juros Mapping and Sum (056)

## Tasks

- [x] [FRONTEND] Criar o arquivo utilitário `src/lib/parsers/storeMapping.ts` exportando a função `normalizeRedeStoreName` com o dicionário de DE/PARA em *lowercase* para evitar falhas case-sensitive.
- [x] [FRONTEND] Alterar `src/lib/parsers/redeParser.ts` para importar `normalizeRedeStoreName`. Aplicar ao extrair `storeName` da linha (coluna 9). Caso retorne `"IGNORAR"`, aplicar `continue` para não popular o array de transações.
- [x] [FRONTEND] Alterar `src/lib/parsers/jurosRedeParser.ts` para importar `normalizeRedeStoreName`. Aplicar à variável `storeStr` / `block.name`. Caso retorne `"IGNORAR"`, aplicar `continue` para não criar a despesa de juros desta coluna/bandeira.
- [x] [FRONTEND] Verificar `src/components/importacoes/WizardImportacao.tsx` e `src/hooks/useCentralImport.ts` para confirmar que a propriedade `totalInterest` retornada pelo `redeParser.ts` não está sendo descartada e, se necessário, incluí-la no array final de transações para inserção na tabela `transactions`.
- [x] [TEST] Testar unitariamente ou dry-run (verificando os tipos) que um mock com loja "visa" é omitido e "MPJabaquara" vira "Jabaquara - JAB".
