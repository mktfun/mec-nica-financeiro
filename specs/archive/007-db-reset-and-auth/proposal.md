# Proposal: Reset do Banco e Ajuste na ConciliaçÁo (007)

## Contexto
O usuário relatou dois problemas críticos:
1. **Login Travado**: A tela de login ficava carregando infinitamente se o servidor de desenvolvimento caísse ou houvesse erro de rede, sem mostrar mensagem de erro (falta de tratamento de exceçÁo).
2. **Lógica de ConciliaçÁo e Limpeza**: Como previamente discutido, a conciliaçÁo atual subtraía o "Dinheiro da Gaveta" (Cash) do "Faturamento Total" da planilha (que inclui PIX e CartÁo). O resultado era uma divergência falsa. Além disso, o usuário solicitou o reset total das tabelas ("limpar tudo") para recomeçar com a lógica certa baseada nas primeiras diretrizes.

## Objetivo
1. **Corrigir o Login**: Implementar tratamento robusto de erros (`try/catch`) no hook `useAuth.ts` para destravar o UI em falhas.
2. **Resetar o Banco**: Apagar todos os dados das tabelas de transaçÁo (`patio_os`, `receivables`, `conciliations`, `alerts`, `daily_cash_values`).
3. **Corrigir Lógica do Dinheiro**: Fazer o sistema capturar especificamente os pagamentos classificados como "Dinheiro" na planilha e salvar isso no campo `financial_total`. A divergência será a subtraçÁo exata do Dinheiro Planilha vs Dinheiro Caixa.

## Requisitos e User Stories
- **Auth**: Como usuário, ao tentar logar com servidor fora ou erro, quero ver uma mensagem clara em vez de um spinner infinito.
- **ConciliaçÁo Focada**: Como Daniel, quero digitar o caixa físico e ver o sistema compará-lo APENAS com as transações em dinheiro que o sistema Oficina Inteligente registrou.
- **Reset Seguro**: Limpar os testes antigos do banco de dados sem deletar os usuários ou tabelas do sistema.

## O que JÁ EXISTE e será REUTILIZADO
- O fluxo de login na UI e os hooks do auth.
- A funçÁo de importar relatório (`ImportReportDialog.tsx`).
- O schema e tabelas no Supabase.

## O que precisa ser MODIFICADO
- Modificar `useAuth.ts` (`login`).
- Alterar o `useImportProcessor.ts` e `ImportReportDialog.tsx` para passar a fatia do "Dinheiro".
- Script SQL para deletar registros das tabelas específicas no backend.

## Critérios de Aceite
1. Se a internet cair no login, ele para de carregar e mostra "Erro de conexÁo".
2. As planilhas importadas só alimentam o `financial_total` com a soma do método de pagamento "Dinheiro".
3. Todas as OSs e Relatórios pregressos foram expurgados para testes limpos.
