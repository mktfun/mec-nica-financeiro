# Design: Idempotência e Ingestão Completa da Maquininha (057)

## Arquitetura Técnica
1. Na etapa de parsing (`redeParser.ts` e `jurosRedeParser.ts`), a string da loja será normalizada usando `storeMapping.ts`, mas a função deixará de retornar `"IGNORAR"` para bandeiras, retornando o nome original devidamente "trimmado" caso não haja mapeamento no dicionário.
2. Na interface de Conciliação (`CentralImportWizard.tsx`), durante a criação do payload para inserção (`handleConfirm`), toda transação de Maquininha (source: `maquininha`, `rede`, ou `rede_taxa`) passará a ter a propriedade `fitid` gerada a partir da função `generateDeterministicId()`.
3. O payload chamará a função normal (`useBulkInsertTransactions`), que graças à presença da chave `fitid` no objeto, fará um UPSERT no banco. O banco ignorará silenciosamente a duplicata na tabela `transactions`.

## Interfaces TypeScript
*Nenhuma nova interface. Utilizaremos o campo `fitid` (string nula) que já existe no DTO de transações do banco.*

## Componentes / Hooks / Funções

1. **`src/lib/parsers/storeMapping.ts`**
   - Alteração: Remoção de chaves destrutivas do dicionário.

2. **`src/components/importacoes/CentralImportWizard.tsx`**
   - Função utilitária no topo:
     ```typescript
     function generateSyntheticFitId(source: string, store: string, date: string, amount: number, method: string = '') {
       // Cria uma hash simples porém determinística
       const rawString = `${source}_${store}_${date}_${amount}_${method}`.trim().toLowerCase();
       // Para maior robustez em caso de caracteres especiais, podemos usar encodeURIComponent ou apenas remover espaços
       return rawString.replace(/\s+/g, '_');
     }
     ```
   - Inserção na construção dos arrays:
     ```typescript
     txsToInsert.push({
       ...
       fitid: generateSyntheticFitId('maquininha', item.storeName, date, item.amount),
     });
     ```
   - (Idem para os sub-arrays de `rede` e `rede_taxa`).

3. **`src/components/importacoes/WizardImportacao.tsx`** (Opcional, caso também seja utilizado de fallback)
   - Aplicação da mesma lógica de hashing na construção dos objetos de Maquininha.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: Importar um Extrato da Rede com loja `Visa`.
  - *Estado Inicial*: DB sem dados.
  - *Ação*: O sistema exibirá a loja `Visa` na tela de mapeamento e criará uma transação com `fitid = rede_visa_20231010_1500_credito`.
  - *Resultado*: Inserção com sucesso.
- **Cenário 2**: Reimportar o mesmo Excel da Rede.
  - *Ação*: O array de importação será gerado idêntico.
  - *Resultado*: O backend (`useBulkInsertTransactions`) executará Upsert e a contagem da tabela não aumentará (Sem duplicidade na conciliação do dia).
