# Spec 402 — Spec Plan: Eliminacao do Frankenstein Matematico & Reatividade Total do Caixa

> **Status:** PROPOSTO (Aguardando aprovacao via /vibe-apply 402 ou /sdd-apply 402)
> **Branch / Contexto:** specs/402-fix-reatividade-caixa-e-baixa-cofre/
> **Objetivo:** Unificar a formula de consolidacao de caixa no frontend e sincronizar o cofre (store_cash_vault) eliminando a dessincronizacao entre cards do topo e esteira contabil.

---

## Fases de Execucao

### Fase 1: Sincronizacao e Auditoria do Banco de Dados (14/09/2026)
- [x] 1.1 Inspecionar os registros de store_cash_vault e atualizar daily_snapshots.metadata.dinheiro_lojas de 14/09 para R$ 3.380,00 (saldo real das pendencias de Maua, Jabaquara e Piraporinha).
- [x] 1.2 Atualizar daily_snapshots.total_patio para R$ 75.385,62 e recomputar os campos persistidos do snapshot de 14/09 para consistencia historica.

### Fase 2: Unificacao da Reatividade no Hook e Frontend
- [x] 2.1 Modificar src/hooks/useBackendConciliacao.ts para que caixa_atual, fluxo_caixa, valor_disp_contas e diferenca_final sejam sempre calculados a partir dos 5 pilares enriquecidos dinamicos, nunca reutilizando o fluxo_caixa congelado do snapshot quando houver divergencia.
- [x] 2.2 Modificar src/components/conciliacao/ResumoDiaPanel.tsx eliminando a bifurcacao ternaria isEditing ? dinamico : snapshot. Garantir que caixaAtualCalculado, fluxoCaixaCalculado, valorDispContasCalculado e diferencaFinalCalculada sejam 100% canonicos e reativos em todos os modos.
- [x] 2.3 Ajustar a renderizacao do chip "Dinheiro no Cofre" em ResumoDiaPanel.tsx para refletir summary?.dinheiro_lojas dinamico ou soma direta das pendencias em aberto.

### Fase 3: Robustez na Baixa de Dinheiro do Cofre
- [x] 3.1 Revisar src/components/conciliacao/BaixaDinheiroModal.tsx para tratar explicitamente o retorno da RPC dar_baixa_dinheiro (
rpcData.success).
- [x] 3.2 Remover mutacoes manuais redundantes no modal que competem com a RPC e garantir invalidacao imediata de cache (daily-reconciliation-summary, store-cash-vault-pending, backend-conciliacao).
- [x] 3.3 Atualizar atomicamente o metadata.dinheiro_lojas do snapshot correspondente ao concluir a baixa.

### Fase 4: Validacao, Build Gate e Auditoria
- [x] 4.1 Executar pm run build ou typecheck terminal (px tsc --noEmit) para garantir zero regressoes de tipagem.
- [x] 4.2 Simular matematicamente o fechamento de 14/09/2026 com os 5 pilares:
  - Saldo Bancos Positivo: R$ 56.666,57
  - Dinheiro MP: R$ 0,00
  - A Receber: R$ 137.643,59
  - Patio OS: R$ 75.385,62
  - Saldo Negativo Itau: -R$ 10.494,58
  - Caixa Atual Canonico: R$ 259.201,20
- [x] 4.3 Testar reatividade: verificar se a alteracao de qualquer pilar propaga instantaneamente para Caixa Atual, Fluxo de Caixa, Valor Disponivel e Diferenca Final.
- [x] 4.4 Disparar aviso para teste humano e aguardar comando de arquivamento.

---

## Circuit Breakers Ativos
- **Anti-Auto-Apply:** Nenhuma alteracao em src/ ou supabase/ sera executada nesta fase.
- **Aprovacao Necessaria:** Aguardar comando /vibe-apply 402 ou /sdd-apply 402.
