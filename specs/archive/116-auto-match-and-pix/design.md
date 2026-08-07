# Design: Automação do Pareamento e Tag de PIX (116)

## 1. Módulo: Central de Importação (\CentralImportWizard.tsx\)
**Adição de PIX:**
Na montagem do payload 	xsToInsert para iteradores de OFX:
`	ypescript
    const isPix = tx.title?.toUpperCase().includes('PIX') ? 'pix' : null;
    txsToInsert.push({
      ...
      payment_method: isPix,
      ...
    });
`
Isso resolverá o fato de payment_method estar sendo deixado para trás ao importar o banco, fazendo com que o dashboard e a conciliação o contabilizem na variável _pix.

**Disparo de Pareamento:**
Antes de gravar daily_snapshots, injetaremos a chamada:
`	ypescript
    addLog("🔧 Pareando transações importadas com Ordens de Serviço...", "info");
    const { error: matchErr } = await supabase.rpc('auto_match_transactions', { p_date: targetDate });
    if (matchErr) throw matchErr;
`

## 2. Módulo: Painel de Conciliação (\ResumoDiaPanel.tsx\)
- Remover o botão Parear Transações (<Button onClick={handleMatchTransactions} ...>)
- Remover o state isMatching e a função handleMatchTransactions.
