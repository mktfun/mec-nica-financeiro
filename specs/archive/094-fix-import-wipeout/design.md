# Design: Fim do Efeito Wipeout (094)

## Arquitetura Técnica

O gargalo e destruição de dados ocorrem dentro do hook `useBulkInsertTransactions` localizado em `src/hooks/useTransactions.ts`.

### O Que Será Alterado
1. **Filtro Estrito no Delete de Fallback:**
   No bloco que processa `otherTxs` (linha 403+ de `useTransactions.ts`), o código atual executa:
   ```typescript
   const delQuery = supabase.from('transactions').delete().eq('target_date', tDate).is('fitid', null);
   ```
   Isso deleta indiscriminadamente. O design correto exigirá uma restrição pela origem dos arquivos em lote, isolando a zona de exclusão:
   ```typescript
   const delQuery = supabase.from('transactions')
      .delete()
      .eq('target_date', tDate)
      .in('source', ['rede', 'maquininha']); // BLINDAGEM AQUI
   ```

2. **Remoção da Exclusão Prévia de OFX:**
   O bloco que deleta OFX (linha 381):
   ```typescript
   const delQuery = supabase.from('transactions').delete().eq('source', 'ofx').eq('target_date', tDate);
   ```
   Isso será **removido completamente**. O OFX já é protegido contra duplicação porque o banco de dados tem restrição de Unique ou o comando `upsert` com `onConflict: 'store_id, fitid'` dá conta do recado mantendo os UUIDs primários (desde que `ignoreDuplicates: true` seja respeitado ou que a chave primária não seja sobreposta destrutivamente). Para garantir que o ID não seja sobrescrito se já existir, removeremos o `id` gerado sinteticamente do payload *se o registro já existir* ou confiaremos no `ignoreDuplicates`.
   *Design Decision:* Apenas usar o `upsert` com `ignoreDuplicates: true` sem o delete antes.

## Cenários de Verificação
- **Cenário 1 (Teste do Fim do Wipeout):**
  1. O usuário tem um lançamento manual no dia X (`source: 'manual'`).
  2. O usuário importa um lote de maquininha do dia X.
  3. Resultado Esperado: O lançamento manual não pode desaparecer.
- **Cenário 2 (Reimportação Segura de OFX):**
  1. O usuário importa o OFX do dia Y e amarra um PIX a uma OS (gera um `conciliation_match`).
  2. O usuário reimporta o mesmo OFX.
  3. Resultado Esperado: A amarração não desaparece (a transação manteve seu ID original).
