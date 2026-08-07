# Design: Fix Maquininha Conciliation & Preview (084)

## Arquitetura Técnica
A camada de importaçÁo `CentralImportWizard.tsx` deve preparar um array em memória de `transactions` (txsToInsert) antes de fazer o POST para o Supabase. Restauraremos a lógica de adicionar objetos `maquininhaItems` e `redeResults` nesse array para garantir a visibilidade nas tabelas de conciliaçÁo.
Os hooks React-Query em `useConciliacao.ts` serÁo ajustados para isolar rigidamente as datas baseando-se em `target_date`, erradicando as anomalias onde dias sem importaçÁo puxavam transações importadas com `target_date` diferente.

## Componentes / Hooks

1. **`CentralImportWizard.tsx`**:
   - FunçÁo `handleConfirm`: 
     - Adicionar iteraçÁo sobre `maqByStore` e `redeByStore` para gerar transações de `source: 'maquininha'` e `source: 'rede'` e empurrar (push) para `txsToInsert` com o respectivo `target_date`.
   - RenderizaçÁo da UI (Card da loja):
     - Atualizar o cálculo de `storeRedeNet` para somar também o valor de `results.maquininhaItems` que tenham o `storeName` correspondente à loja.
2. **`useConciliacao.ts`**:
   - `useSystemTransactions(date)`: Trocar `created_at` (range de 24h) por `.eq('target_date', date)`.
   - `useDailyReconciliationDelta(targetDate)`: Trocar `occurred_at` (range de 24h) por `.eq('target_date', targetDate)`.

## Funções Auxiliares Necessárias
Utilizaremos `crypto.randomUUID()` para os IDs das transações de maquininha, e a funçÁo `generateSyntheticFitId` (se importada) ou uma chave única composta para evitar colisões ao re-importar.

## Fluxo de UI
1. O usuário visualiza o preview na etapa 3: a coluna "Maquininha" exibe a soma de Rede + Maquininhas genéricas juntas sem confusÁo.
2. O usuário conclui a importaçÁo.
3. Ao abrir a tela de ConciliaçÁo, o total de Maquininha aparece corretamente (nÁo zerado).
4. O usuário muda para o dia anterior (onde nÁo importou nada): os valores ficam perfeitamente zerados sem herdar transações de arquivos antigos.
