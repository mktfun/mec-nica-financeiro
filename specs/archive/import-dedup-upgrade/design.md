# Design: Upgrade de Deduplicação Global nas Importações (import-dedup-upgrade)

## Arquitetura Técnica
A transformação ocorrerá no "Estágio 0" da esteira de dados. Em vez de confiar em strings externas, a própria UI sanitiza as strings e aplica um hash MD5-like local para garantir a identidade da transação, independente de banco de dados.

Pipeline Flux:
`Parser Frontend (OFX/Maquininha) → String Sanitizer → Geração Hash Composto → Objeto Transação [Hash] → Supabase RPC / Upsert (Deduplica e Consolida)`

## Interfaces TypeScript
```typescript
// Helper Global de Hash (a ser injetado/reutilizado em lib/parsers/utils)
export const generateDeterministicHash = (date: string, amount: number, memo: string, type: 'ofx' | 'pos'): string => {
  const safeMemo = (memo || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const safeAmount = Math.abs(amount).toFixed(2);
  return `${type}_${date}_${safeAmount}_${safeMemo}`;
};
```

## Componentes / Hooks / Funções
1. `src/lib/parsers/ofxParser.ts`
   - *Responsabilidade*: Interceptar transações lidas do XML e sobrescrever *todos* os `TRN.FITID` pelo nosso `generateDeterministicHash(..., 'ofx')`.
2. `src/components/importacoes/CentralImportWizard.tsx` e `WizardImportacao.tsx`
   - *Responsabilidade*: Para planilhas de maquininha, iterar sobre `posTxs` e gerar a key `dedup_hash` invocando `generateDeterministicHash(..., 'pos')`.
3. `src/hooks/useTransactions.ts`
   - *Responsabilidade*: No `posTxs`, injetar o parâmetro `.upsert(posTxs, { onConflict: 'store_id, dedup_hash', ignoreDuplicates: true })` em vez de `.insert()`.
4. `supabase/migrations/2026..._add_pos_dedup_hash.sql`
   - *Responsabilidade*: Criar a coluna e índice de integridade.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Importar o mesmo arquivo OFX Itaú do dia 08/08 duas vezes seguidas.
  - *Resultado Esperado*: A segunda importação passa silenciosamente e não insere nenhum registro adicional.
- **Cenário 2:** Importar a planilha Excel de Maquininha duas vezes seguidas.
  - *Resultado Esperado*: A segunda importação bate na trava Unique do `dedup_hash` e ignora duplicidades, salvando o banco de `pos_transactions` da corrupção diária de dados.
- **Cenário 3:** Importar um OFX em que o banco repetiu o mesmo `<FITID>` nativo para dois PIX recebidos de valores e destinatários diferentes.
  - *Resultado Esperado*: O parser vai dropar o FITID duplicado do banco, gerará 2 Hashes Diferentes baseados no nome/valor, e *ambas* as transações entrarão seguras no sistema sem esmagar uma à outra.
