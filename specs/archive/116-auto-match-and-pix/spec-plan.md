# Spec Plan: AutomaçÁo do Pareamento e Tag de PIX (116)

## 1. ImportaçÁo Automática e PIX (Frontend)
- [x] Abrir `src/components/importacoes/CentralImportWizard.tsx`
- [x] Localizar o bloco onde `txsToInsert.push` é feito para o array `ofxResults` (linhas ~270-290).
- [x] Adicionar lógica ternária inferindo `payment_method: tx.title?.toUpperCase().includes('PIX') ? 'pix' : null` no push.
- [x] Localizar a etapa 4 (Salvar Daily Snapshot) no final do arquivo.
- [x] Injetar `await supabase.rpc('auto_match_transactions', { p_date: targetDate });` logo antes da gravaçÁo do log de conclusÁo e do snapshot.

## 2. Limpeza de BotÁo Manual (Frontend)
- [x] Abrir `src/components/conciliacao/ResumoDiaPanel.tsx`
- [x] Excluir state `isMatching` e `handleMatchTransactions`.
- [x] Excluir o bloco do `<Button onClick={handleMatchTransactions}>` (botÁo "Parear Transações").
