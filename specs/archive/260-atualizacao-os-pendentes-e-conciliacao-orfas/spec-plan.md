# Spec Plan: Atualização de OSs Pendentes & Conciliação Automática com Transações Órfãs (260)

## Tasks

- [x] [BACKEND] Criar migration `20260821000010_auto_match_pending_os.sql` atualizando a RPC `auto_match_transactions(p_date DATE)` com pareamento inteligente por saldo pendente, quitação de OSs em aberto e baixa automática de status no pátio
- [x] [BACKEND] Aplicar migration 0010 na base Supabase via REST API
- [x] [FRONTEND] Atualizar `CentralImportWizard.tsx` para:
  - Auto-preencher o campo `contasManual` com o total de Contas a Pagar importadas (ex: R$ 195.066,04) com tag visual de auto-preenchido
  - Exibir no card de OS o Delta de novos recebimentos e o Estoque Ativo de OSs no Pátio (evitando mostrar R$ 0,00 de forma enganosa quando o pátio está ativo)
  - Exibir no log de finalização a quantidade de OSs pendentes conciliadas e quitadas
- [x] [FRONTEND] Atualizar `MatchManualOsPendente.tsx` para sincronizar o saldo das OSs atualizadas
- [x] [TEST] Testar a execução do auto-match com transações órfãs do dia 21 e validar a baixa das OSs pendentes
- [x] [TEST] Executar `npm run build` para garantir zero erros de compilação
