# Spec 035 - Design

## Interface de Usuário (Stitch MCP)
1. **Histórico de Importações (`src/routes/importacoes.tsx`)**
   - Atualizar a UI do card de histórico: Onde estava escrito `Lote OS` e lia a propriedade `log.total_os`, se o `log.os_count === 1` e `log.total_paid_all > 0`, nós tratamos como um lote misto ou OFX e devemos ler `log.total_paid_all`.
   - Adicionar uma condicional: Se o `store_name` começar com `[OFX]`, a label da div deve ser vermelha/laranja escrito **Extrato** em vez de **Lote OS**.
   - Isso garantirá que R$ 0,00 não apareça para importações ricas, devolvendo a sensação de sucesso visual.

2. **Dashboard de Conciliação Global (`src/routes/conciliacao.tsx`)**
   - Na listagem de Lojas: O componente já lê a variável `bank = (rec as any)?.bank_total || 0;`.
   - Como agora o `bank_total` será preenchido ativamente pela RPC de atualização, não precisamos fazer alterações no React, exceto garantir que a divergência está sendo calculada logicamente certa (o componente já faz: `sys - bank`).

## Banco de Dados (Supabase MCP)
1. **Migration (RPC de Consolidar Extrato):**
   - Precisamos de uma RPC (ou Trigger) que atualize a tabela `reconciliations.bank_total`.
   - O melhor caminho arquitetural (pois já existe conciliação explícita): Ao confirmar o lote em `WizardImportacao.tsx`, podemos chamar uma RPC `update_reconciliation_bank_total(p_date)` que soma todos os transactions de OFX em determinada data para todas as lojas, e faz um UPSERT em `reconciliations` atualizando a coluna `bank_total`.
   - Como alternativa, fazer via Edge Function/Trigger para ser passivo. Faremos a RPC para manter controle estrito das datas afetadas no frontend.
