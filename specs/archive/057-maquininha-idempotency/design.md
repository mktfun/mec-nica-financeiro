# Design: Idempotência e IngestÁo Completa da Maquininha (057)

## Arquitetura Técnica
1. Na etapa de parsing (`redeParser.ts` e `jurosRedeParser.ts`), a string da loja será normalizada usando `storeMapping.ts`, mas a funçÁo deixará de retornar `"IGNORAR"` para bandeiras, retornando o nome original devidamente "trimmado" caso nÁo haja mapeamento no dicionário.
2. Na interface de ConciliaçÁo (`CentralImportWizard.tsx`), durante a criaçÁo do payload para inserçÁo (`handleConfirm`), toda transaçÁo de Maquininha (source: `maquininha`, `rede`, ou `rede_taxa`) passará a ter a propriedade `fitid` gerada a partir da funçÁo `generateDeterministicId()`.
3. O payload chamará a funçÁo normal (`useBulkInsertTransactions`), que graças à presença da chave `fitid` no objeto, fará um UPSERT no banco. O banco ignorará silenciosamente a duplicata na tabela `transactions`.

## Interfaces TypeScript
*Nenhuma nova interface. Utilizaremos o campo `fitid` (string nula) que já existe no DTO de transações do banco.*

## Componentes / Hooks / Funções

1. **`src/lib/parsers/storeMapping.ts`**
   - AlteraçÁo: RemoçÁo de chaves destrutivas do dicionário.

2. **`src/components/importacoes/CentralImportWizard.tsx`**
   - FunçÁo utilitária no topo:
     ```typescript
     function generateSyntheticFitId(source: string, store: string, date: string, amount: number, method: string = '') {
       // Cria uma hash simples porém determinística
       const rawString = `${source}_${store}_${date}_${amount}_${method}`.trim().toLowerCase();
       // Para maior robustez em caso de caracteres especiais, podemos usar encodeURIComponent ou apenas remover espaços
       return rawString.replace(/\s+/g, '_');
     }
     ```
   - InserçÁo na construçÁo dos arrays:
     ```typescript
     txsToInsert.push({
       ...
       fitid: generateSyntheticFitId('maquininha', item.storeName, date, item.amount),
     });
     ```
   - (Idem para os sub-arrays de `rede` e `rede_taxa`).

3. **`src/components/importacoes/WizardImportacao.tsx`** (Opcional, caso também seja utilizado de fallback)
   - AplicaçÁo da mesma lógica de hashing na construçÁo dos objetos de Maquininha.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: Importar um Extrato da Rede com loja `Visa`.
  - *Estado Inicial*: DB sem dados.
  - *AçÁo*: O sistema exibirá a loja `Visa` na tela de mapeamento e criará uma transaçÁo com `fitid = rede_visa_20231010_1500_credito`.
  - *Resultado*: InserçÁo com sucesso.
- **Cenário 2**: Reimportar o mesmo Excel da Rede.
  - *AçÁo*: O array de importaçÁo será gerado idêntico.
  - *Resultado*: O backend (`useBulkInsertTransactions`) executará Upsert e a contagem da tabela nÁo aumentará (Sem duplicidade na conciliaçÁo do dia).
