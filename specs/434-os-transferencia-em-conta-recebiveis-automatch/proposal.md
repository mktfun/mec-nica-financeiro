# 📋 SDD Proposal — Cadastro Ágil de Transferência em Conta na OS e Baixa Automática no OFX

- **Spec ID:** `434-os-transferencia-em-conta-recebiveis-automatch`
- **Data:** 2026-09-22
- **Autor:** Antigravity 2.0 (Single-Agent Direto)

---

## 1. Problema Diagnosticado

1. **Ausência de Alerta Visual para Transferências em Aberto:** Quando uma OS é fechada ou atualizada com forma de pagamento "Transferência em Conta" (ou TED/DOC/Depósito em Conta com compensação futura), não há nenhum alerta, badge ou indicador visual no painel da loja ou da conciliação avisando que aquele valor está aguardando crédito em conta bancária.
2. **Fricção Operacional no Cadastro de Recebíveis:** Para registrar as datas de vencimento e parcelas dessa transferência, o usuário é forçado a sair do módulo da conciliação, navegar até a tela isolada de Recebíveis (`/recebiveis`), localizar a filial, redigitar o número da OS, cliente, valor e datas manualmente.
3. **Ausência de Baixa Automática no Pipeline do Wizard:** Embora a RPC `auto_match_receivables` já exista no banco de dados para casar créditos OFX com títulos em `receivables`, ela não era chamada durante o processamento do `CentralImportWizard.tsx`. Assim, quando o cliente efetua a transferência e o dinheiro cai no extrato bancário, o sistema não dá baixa automática na parcela da OS.

---

## 2. Solução Proposta

1. **Forma de Pagamento "Transferência em Conta" e Alerta Visual na OS:**
   - Adicionar "Transferência em Conta" como opção selecionável nas formas de pagamento em `StoreOrdensServicoView.tsx` (tanto no modal de criação quanto na edição inline).
   - Exibir um Badge / Alerta visual destacado (ex: `⚠️ Transferência em Conta Pendente`) nas OSs com essa forma de pagamento.

2. **Modal Ágil de Desdobramento de Parcelas de Transferência (`CadastrarTransferenciaOsModal.tsx`):**
   - Disparado diretamente pela tela de OSs da loja (ao selecionar a forma de pagamento ou via botão "Desdobrar Parcelas" na linha da OS).
   - O modal já abre com Loja (`store_id`, `store_name`), Número da OS (`os_number`), Cliente (`client_name`) e Valor Total preenchidos.
   - Solicita exclusivamente:
     * Quantidade de parcelas (1x, 2x, 3x... até 12x).
     * Valor de cada parcela (distribuído automaticamente, com edição livre).
     * Data de vencimento de cada parcela (`due_date`).
   - Ao salvar, insere os registros na tabela `public.receivables` com `type = 'Transferência'`, `status = 'pendente'` e `os_number` preenchido.

3. **Integração de Auto-Match no Wizard de Importação:**
   - No `CentralImportWizard.tsx`, durante a etapa de matching pós-ingestão, disparar a RPC `auto_match_receivables` para a data de conciliação.
   - Quando um crédito no extrato OFX coincidir com o valor da parcela daquela filial:
     * Dá baixa automática no recebível (`status = 'recebido'`, `paid_value = amount`, `matched_ofx_id = ofx.id`).
     * Atualiza a transação do OFX (`matched_os_number = os_number`, `manual_category = 'Recebimento Transferência OS'`).
     * Emite notificação/log no painel confirmando a liquidação da transferência.

---

## 3. Skills Especializadas Aplicadas
- `frontend-design-pro`: Interface Dark UI Zinc-950, sem classes arbitrárias, feedback instantâneo via Sonner toasts e Rauno Freiberg micro-interactions.
- `backend-patterns`: Server mutations com rollback seguro, Zod validation para dados de parcelas e consistência relacional com `patio_os` e `receivables`.
- `database`: Reutilização da tabela `public.receivables` e da RPC `auto_match_receivables`, sem alterações no schema DDL.

---

## 4. Arquivos Afetados

### [Arquivos Existentes Modificados]
- `src/components/conciliacao/StoreOrdensServicoView.tsx`: Opção de pagamento, trigger do modal e badges informativos.
- `src/hooks/useRecebiveis.ts`: Hook para inserção em lote de parcelas vinculadas à OS.
- `src/components/importacoes/CentralImportWizard.tsx`: Chamada de auto-match de recebíveis no fechamento do dia.

### [Arquivos Novos]
- `src/components/conciliacao/CadastrarTransferenciaOsModal.tsx`: Modal com design system Zinc-950 para desdobramento de parcelas.

---

## 5. Critérios de Aceitação Verificáveis
1. Ao atualizar ou cadastrar uma OS com forma de pagamento "Transferência em Conta", o modal permite definir parcelas e vencimentos sem precisar acessar a tela `/recebiveis`.
2. As parcelas são gravadas em `receivables` vinculadas à loja e ao número da OS.
3. A linha da OS na visualização da loja exibe o indicador visual da transferência.
4. Quando o extrato OFX é processado no wizard, créditos com o valor da parcela casam automaticamente e baixam o título.
5. Build limpo via `npm run build` com 0 erros de TypeScript.

---

## 6. Plano de Rollback
- Reversão atômica via Git dos arquivos modificados.
