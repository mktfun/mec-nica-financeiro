# Proposal: Atualização de OSs Pendentes & Conciliação Automática com Transações Órfãs (260)

## Problema
1. **OSs Pendentes Não Conciliadas com Transações Órfãs:**
   - Veículos entram no pátio e suas Ordens de Serviço (OSs) ficam com status `em_aberto` ou `pago_parcial`.
   - Quando o cliente realiza um pagamento via PIX (extrato OFX) ou cartão (Rede) em dias posteriores, essas transações entram como **órfãs** no banco.
   - A RPC atual `auto_match_transactions` possui um filtro rígido que exige `closed_at >= p_date - 3 days`. Isso impede que qualquer OS que ainda esteja aberta (onde `closed_at` é NULL ou a abertura ocorreu há mais de 3 dias) seja localizada e quitada automaticamente pelo extrato bancário.
2. **Falta de Baixa Automática de Pátio:**
   - Quando uma transação bancária/maquininha entra e corresponde ao valor pendente (`total_value - paid_value`) de uma OS em aberto, o sistema não atualiza o `paid_value` nem muda o status da OS para `finalizado`, gerando descompasso entre o pátio e o financeiro.
3. **Exibição Confusa de "Total OS R$ 0,00" no Preview da Importação:**
   - Na tela de conferência da importação (`CentralImportWizard.tsx`), se o arquivo do dia trouxer OSs cujo valor já constava no banco, o cálculo de incremento (`delta_paid`) zera, exibindo `R$ 0,00` no topo, embora existam centenas de milhares de reais em OSs ativas no pátio das 10 lojas.

## Solução Proposta
1. **Motor Aprimorado de Pareamento de OSs Pendentes & Órfãs (`auto_match_transactions`):**
   - Atualiza a RPC no PostgreSQL para buscar OSs em aberto (`status IN ('em_aberto', 'pago_parcial')`) por:
     - **Match 1 (Valor Total / PIX Integral):** Quando o PIX do OFX bate com `total_value` ou `pix_transfer_value`.
     - **Match 2 (Saldo Pendente / Quitação de Saldo):** Quando o PIX bate exatamente com `total_value - paid_value`.
     - **Match 3 (Baixa Parcial):** Quando o PIX bate com o valor do pagamento registrado na planilha diária.
   - Ao encontrar o match:
     - Cria o registro em `conciliation_matches`.
     - Atualiza `ofx_transactions.matched_os_number` e `ofx_transactions.store_id`.
     - Atualiza `patio_os.paid_value`, `patio_os.matched_ofx_id`, `patio_os.status` (para `finalizado` se quitado) e `patio_os.closed_at = p_date`.
2. **Pareamento com Maquininha / Rede:**
   - Suporte a match de transações de cartão individuais ou em lote acumulado com OSs pendentes da loja.
3. **Melhoria no Preview do Import Wizard & Auto-Preenchimento (`CentralImportWizard.tsx`):**
   - **Auto-preenchimento de Contas a Pagar:** Quando um arquivo analítico de contas a pagar (`BuscaContasAPagar.xls`) é importado, preenche automaticamente o campo `contasManual = totalAmount` (ex: R$ 195.066,04) com indicador visual de auto-preenchido, dispensando digitação manual.
   - **Exibição do Pátio:** Exibir com clareza no Card de OS os **Novos Recebimentos / Delta do Dia** e o **Estoque Ativo de OSs no Pátio (R$ 375k+)** por loja.

## Contratos de Dados
- **Tabelas Envolvidas:**
  - `patio_os`: Atualização de `paid_value`, `status`, `closed_at`, `matched_ofx_id`.
  - `ofx_transactions`: Atualização de `matched_os_number`, `store_id`.
  - `pos_transactions`: Atualização de `matched_os_number`.
  - `conciliation_matches`: Inserção de registros de pareamento.
- **RPC Principal:** `public.auto_match_transactions(p_date DATE)` (atualizada e estendida para suportar OSs pendentes).

## Features Existentes Impactadas
- `src/components/importacoes/CentralImportWizard.tsx` (Preview de OS e disparo do auto-match)
- `src/components/importacoes/MatchManualOsPendente.tsx` (Fila de órfãos manuais)
- `supabase/migrations/` (RPC `auto_match_transactions`)

## Risco Principal
- **Risco:** Parear erroneamente uma transação com valor idêntico em uma loja errada.
- **Mitigação:** Exigir correspondência estrita por `store_id` (loja da transação = loja da OS) e janela de tolerância máxima de 0.05 centavos.
