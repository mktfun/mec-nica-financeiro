# Proposal: Inversão do Pipeline de Ingestão com Motor Automático + IA e Unificação do Vínculo Manual PIX & REDE (321)

## Problema
1. **Fluxo Invertido e Redundante no Wizard**:
   - No wizard de importação (`CentralImportWizard.tsx`), o usuário era direcionado para as etapas manuais de vínculo de transações (`Step1UnregisteredPayments.tsx`) e justificativas (`Step2NonRevenueJustifications.tsx`) **antes** de o sistema gravar os dados no banco e rodar o motor automático de conciliação (auto-match de 3 camadas no PostgreSQL, auto-match de saídas e reconciliação de IA com Gemini).
   - O usuário era forçado a tentar casar manualmente transações que o próprio motor e a IA resolveriam automaticamente em segundos.
2. **Experiência Fraca de Match Manual no Wizard vs Tela de Extrato**:
   - Na tela de extrato (`StoreExtratoBancarioView.tsx`), o sistema já possui um modal excelente (`ManualMatchOsModal.tsx`) com isolamento estrito por filial (`store_id`), cálculo de score inteligente (100 = Nome + Valor, 80 = Nome, 60 = Valor Exato), ordenação por menor diferença e identificação clara de status da OS.
   - No wizard (`Step1UnregisteredPayments.tsx`), a interface de match era um modal em memória básico, sem ranking por score, sem suporte adequado para transações de cartão REDE e sem candidatos ordenados.

## Solução Proposta (Foco em Reuso e Correção)
1. **[MODIFY] Inversão da Esteira no `CentralImportWizard.tsx` (Automação Primeiro, Humano Depois)**:
   - No step de Processamento de Arquivos:
     1. Gravar todas as fontes no Supabase (`patio_os`, `pos_transactions`, `ofx_transactions`, `daily_manual_bills`, `daily_snapshots`).
     2. Disparar em paralelo/sequência as RPCs:
        - `public.auto_match_transactions(targetDate)` (Auto-match de 3 camadas OFX x OS).
        - `public.auto_match_saidas(targetDate)` (Auto-match Débitos OFX x Contas a Pagar).
        - `public.calculate_daily_conciliation(targetDate)` (Tripla conciliação de cartões).
        - Reconciliador de IA com Gemini (`reconcileRedeWithOfxViaGemini`).
     3. Filtrar e exibir no Step 1 **apenas as transações que continuaram genuinamente órfãs / sem vínculo**. Se todas forem casadas automaticamente, o wizard avança direto com toast de sucesso.
2. **[MODIFY] Unificação do Vínculo Manual com `ManualMatchOsModal.tsx` (PIX e REDE)**:
   - Estender `ManualMatchOsModal.tsx` e `useManualMatch.ts` para suportar tanto transações `ofx` (PIX/Transferência) quanto transações `rede` (Venda de Cartão de Crédito/Débito).
   - Manter o isolamento estrito por `store_id`, busca por cliente/placa/número e exibição do candidato mais próximo com Match Score e 1-clique.
3. **[NEW] RPCs Canônicas: `link_manual_pix_to_os`, `link_manual_rede_to_os`, `unlink_manual_os_match`**:
   - Procedures transacionais para vincular vendas de cartão da Rede e PIX/OFX a OSs do pátio com isolamento por `store_id` e sem duplicação de saldo.
4. **[MODIFY] `Step1UnregisteredPayments.tsx`**:
   - Integrar o `ManualMatchOsModal` em substituição ao modal em memória legado.
   - Exibir no topo de cada transação o badge do candidato com maior afinidade para vínculo imediato.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Encontradas:**
  - `auto_match_transactions`: RPC de auto-match de extratos x OSs. Reutilizada 100%.
  - `auto_match_saidas`: RPC de auto-match de saídas bancárias x contas. Reutilizada 100%.
  - `calculate_daily_conciliation`: RPC de apuração de cartões. Reutilizada 100%.
- **Componentes / Hooks Existentes Encontrados:**
  - `ManualMatchOsModal.tsx`: Componente de match inteligente com ranking de score. Reutilizado e estendido para suportar REDE.
  - `useAvailableStoreOs`: Hook de busca de OSs ativas e finalizadas da filial. Reutilizado 100%.
  - `useManualMatch.ts`: Hook de mutações de vínculo. Estendido para suportar REDE e PIX com as novas RPCs atômicas.

## Risco Principal e Mitigação
- **Risco:** Transação de cartão Rede vinculada alterar o total de vendas da maquininha e distorcer o Pilar 1.
- **Mitigação:** A RPC vincula apenas `matched_os_number` e abate o saldo da OS. A apuração de vendas líquidas de cartões continua vindo da soma direta de `pos_transactions` no Pilar 1, garantindo precisão matemática absoluta.
