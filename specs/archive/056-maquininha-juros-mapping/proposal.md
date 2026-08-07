# Proposal: Maquininha and Juros Mapping and Sum (056)

## Problema
O sistema não está associando corretamente as lojas oriundas dos relatórios da maquininha (Rede) aos nomes padrão do sistema e não está filtrando sujeiras (ex: linhas com "Visa", "Mastercard", "Elo"). Como consequência, essas transações não dão *match* automático com as OSs (Pátio) e com os extratos bancários (OFX), além de não totalizar e importar corretamente as despesas de Juros.

## Solução Proposta
1. Criar um utilitário centralizado (`storeMapping.ts`) contendo o dicionário exato fornecido pelo usuário para fazer DE/PARA dos nomes brutos da planilha para os nomes oficiais do banco de dados (ex: `MPSantoAndre` -> `Santo André - HD`).
2. Utilizar a tag especial `IGNORAR` no dicionário para bandeiras e totais que não devem virar lojas.
3. Atualizar o `redeParser.ts` e `jurosRedeParser.ts` para interceptar a leitura do nome da loja. Linhas mapeadas como `IGNORAR` não gerarão transações.
4. Auditar a inserção final na base para certificar que os juros calculados (`totalInterest` do `redeParser` e `expenses` do `jurosRedeParser`) são gravados como transações reais na base para viabilizar a conciliação exata do OFX.

## Contratos de Dados
- **Tabelas Envolvidas:** Nenhuma alteração estrutural no Supabase. O processo usará tabelas existentes (`transactions` para juros, e os inserts normais de `reconciliations` e `patio_os`).

## API / Interface
- **Novo Arquivo:** `src/lib/parsers/storeMapping.ts` com a função `normalizeStoreName`.
- **Modificados:** 
  - `src/lib/parsers/redeParser.ts`
  - `src/lib/parsers/jurosRedeParser.ts`
  - Possivelmente o ponto de submissão do formulário no Frontend que salva os juros de antecipação (`useCentralImport.ts` ou `WizardImportacao.tsx`).

## Features Existentes Impactadas
- (Ref `spec/global/features.md`)
- `useCentralImport`
- Assistente de Importação em lote (Wizard)
- Motor de Conciliação Headless (agora as strings vão bater exatamente, melhorando drasticamente o LLM Matcher e associações exatas).

## Risco Principal
- *Case-sensitivity* ou espaços invisíveis nas strings da planilha ("Visa " em vez de "Visa") que podem burlar o dicionário e causar a criação de lojas falsas novamente. A solução deve forçar `.trim().toLowerCase()` antes do DE/PARA.
