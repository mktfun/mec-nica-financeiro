# Spec Plan: Fechamento Contábil Estrito 16/09, Gestão Rastreável de Dinheiro em Cofre & Sugestão Inteligente de Contas não-OFX (411)

## Tasks

- [x] [DATABASE] Criar migration adicionando suporte a saídas de despesas em `store_cash_vault` (`entry_type`, `expense_category`, `paid_to`, `bill_id`) e coluna `matched_cash_vault_id` em `daily_manual_bills` com índices
- [x] [DATABASE] Atualizar a RPC `get_daily_reconciliation_summary` para calcular saldo de cofre considerando saídas em dinheiro e isolar histórico via snapshot congelado quando fechado
- [x] [FRONTEND] Criar componente `CashVaultCompositionModal.tsx` com visualização detalhada fração a fração (Loja, OS, Cliente, Data, Valor, Status)
- [x] [FRONTEND] Adicionar aba "💡 Sugestões de Saídas (Contas sem OFX)" no modal com listagem de contas de `daily_manual_bills` não conciliadas em OFX e ação de 1 clique "Dar Baixa como Saída em Dinheiro"
- [x] [FRONTEND] Integrar abertura de `CashVaultCompositionModal` ao card de "Dinheiro em Lojas / Cofre" em `ResumoDiaPanel.tsx` com feedback visual interativo
- [x] [FRONTEND] Adaptar `useBackendConciliacao.ts` para carregar a lista completa de transações de cofre (`vault_entries`) e recalcular dinamicamente quando em edição
- [x] [BACKEND] Sincronizar o salvamento do snapshot diário para gravar a foto imutável das frações de cofre e contas baixadas em `daily_snapshots.metadata.cash_vault_snapshot`
- [x] [TEST] Executar teste de mesa completo de abertura de modal, sugestão de conta não-OFX, baixa em dinheiro e verificação de não contaminação entre datas
- [x] [TEST] Rodar build de produção (`npm run build`) e typecheck estrito para garantir integridade do sistema
