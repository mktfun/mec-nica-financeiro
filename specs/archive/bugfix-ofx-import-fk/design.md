# Design: Corrigir Violação de FK na Reimportação de OFX (bugfix-ofx-import-fk)

## Arquitetura Técnica
O fluxo de atualização ocorrerá estritamente na camada de React Query Mutations, mais especificamente na preparação do payload para a RPC (ou `upsert`) do Supabase.

1. **CentralImportWizard** → `saveTransactions(txsToInsert)` (Manda as transações, todas com `id` gerado via `crypto.randomUUID()`).
2. **useBulkInsertTransactions** (Interceptor) → Identifica quais transações vieram do OFX (`t.fitid` existe).
3. **Filtro de Payload** → Omitir a chave `id` de `ofxTxsRaw`:
   ```typescript
   ofxTxsRaw.forEach((t: any) => {
     const key = `${t.store_id || 'null'}_${t.fitid}`;
     const { id, ...rest } = t; // <-- Mágica acontece aqui
     ofxMap.set(key, rest);
   });
   ```
4. **Supabase UPSERT** → `upsert(ofxTxs, { onConflict: 'store_id, fitid' })`. Como `id` não foi fornecido, o Supabase mantém o ID antigo (para UPDATE) ou gera um novo (para INSERT).
5. **CentralImportWizard (Pós-gravação)** → Executa a query `dbTxs` buscando os IDs originais via `fitid`, vincula com `conciliation_matches` e salva corretamente sem violar FK.

## Interfaces TypeScript
Nenhuma nova interface será criada. Utilizaremos o tipo implícito existente ou `TransactionRow`.

## Componentes / Hooks / Funções
1. **`src/hooks/useTransactions.ts`**
   - **Função afetada:** `useBulkInsertTransactions` (dentro da `mutationFn`).
   - **Responsabilidade:** Limpar a chave `id` antes de popular o `ofxMap`.

## Fluxo de UI
Nenhuma alteração visual. O painel continuará mostrando as mensagens de processamento ("Processando relatórios da Rede...", "Conciliando Extratos OFX..."). O erro vermelho (❌) no final do processo deixará de aparecer em caso de reimportação.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Importação Inicial):** [OFX Novo] → [Gravar Batch] → [Supabase gera UUID default] → [Query de FITID pega UUID default] → [Conciliação vincula]. Sucesso.
- **Cenário 2 (Reimportação com OFX idêntico):** [OFX Existente] → [Wizard envia id sintético mas o hook ignora] → [Supabase atualiza campos, mantém ID real] → [Query de FITID pega ID real mantido] → [Conciliação substitui matches antigos e vincula com ID real mantido]. Sucesso sem FK Violation!
