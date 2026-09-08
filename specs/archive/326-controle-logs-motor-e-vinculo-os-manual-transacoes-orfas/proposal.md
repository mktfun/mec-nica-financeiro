# SDD Proposal: Controle Total de Logs do Motor & Vínculo de OS Manual com Transações Órfãs

**Feature ID:** `326-controle-logs-motor-e-vinculo-os-manual-transacoes-orfas`  
**Data:** 08/09/2026  
**Status:** PROPOSTA / SPEC PLANEJAMENTO (Aguardando /apply)  
**Autor:** Antigravity Architect  

---

## 1. Contexto e Problema de Negócio

No fluxo diário da Central de Importações e Conciliação (`CentralImportWizard.tsx`), dois problemas críticos foram reportados pelo operador:

### Problema 1: Pulo Abrupto do Step 8 e Perda de Acesso aos Logs do Motor
- Ao executar o motor de conciliação e gravação no Step 8 (`handleConfirm`), a esteira realiza diversas operações pesadas: persistência em lote de OSs (`patio_os`), transações Rede (`pos_transactions`), extratos bancários (`ofx_transactions`), RPC de pareamento determinístico (`auto_match_daily_transactions`), auditoria via IA Gemini e loop de Auto-Healing (`run_autonomous_reconciliation_loop`).
- **A falha na UX:** Na linha 1944 de `CentralImportWizard.tsx`, ao término do processamento, a esteira executa incondicionalmente:
  ```typescript
  setStep(4);
  ```
- Isso arranca imediatamente o operador do Step 8 sem dar oportunidade de:
  - Ler as mensagens periciais e o status do Auto-Healing no terminal;
  - Copiar os logs gerados para auditoria ou suporte;
  - Baixar os logs em `.txt` ou `.json`;
  - Inspecionar os 4 cards de métricas consolidadas (OSs gravadas, vendas Rede, extratos OFX e deltas).
- Ao pular para o Step 4, o botão "Voltar" redireciona para o Step 3 (Preview de arquivos) em vez do Step 8, fazendo com que o relatório visual do processamento se perca para sempre.

### Problema 2: Digitação Manual de "Total Pago" na OS vs Transações Órfãs (Rede / PIX)
- No Step 2.5 (`MissingPatioOsEditor.tsx`) e em modais de OS (`PatioOsDetailModal.tsx` / `StoreOrdensServicoView.tsx`), existe um campo `<input type="number">` permitindo ao operador digitar livremente o `paid_value` da OS.
- **A inconsistência contábil:**
  - Se o operador digita `paid_value = R$ 500,00` em uma OS que recebeu pagamento por cartão na Rede ou por PIX no banco, a OS é marcada como quitada (`status = 'finalizada'`).
  - Quando o motor roda (ou no Step 4), a transação real de R$ 500,00 que caiu no extrato da Rede ou do Itaú **não encontra a OS** (pois o motor busca OSs abertas/parciais) e permanece como **transação órfã** (`matched_os_number = NULL`).
  - No Step 4 e 5, essa transação aparece como pendente para justificar. Se for justificada como entrada, o faturamento diário da oficina é **duplicado** (R$ 500 da OS + R$ 500 da transação justificada).
  - Pior: no cálculo dos 5 Pilares (`Step4FinalAuditAndClose.tsx`), o Pilar 4 (*Na Loja OS/Pátio*) sofre redução artificial e o Pilar 5 (*Faturamento DRE*) gera diferença em relação ao caixa bancário.
- **A necessidade:** O operador deve atualizar **APENAS o Valor Total da OS** (`total_value`). O valor pago (`paid_value`) NÃO deve ser digitado na mão; ele deve ser liquidado e abatido pelas **transações reais órfãs da mesma loja** (Rede, PIX, ou dinheiro em cofre).

---

## 2. Solução Proposta

Com base na deliberação unânime do Conselho Técnico (`.council/os-manual-orfas-decision.md`), implementaremos uma solução integrada em dois pilares:

### Pilar A: Controle Completo de Logs e Navegação no Step 8
1. **Eliminação do Auto-Avanço Incondicional:**
   - Na linha 1944 de `CentralImportWizard.tsx`, substituir o `setStep(4)` direto por `setSaveFinished(true)`, exibindo os cards comemorativos, o resumo pericial de Auto-Healing e mantendo o terminal visível e interativo.
   - Adicionar controle de avanço:
     - Botão primário destacado: **"Revisar Pagamentos sem OS (Passo 4) →"**.
     - Checkbox opcional: `"Avançar automaticamente para o Passo 4 após conclusão"` (default: desmarcado).
2. **Exportação de Logs no `ImportExecutionTerminal.tsx`:**
   - Botão **"Copiar Logs"** (já existente, mantido e aprimorado).
   - Botão **"Baixar (.txt)"**: gera arquivo de texto legível com timestamps, severidade e mensagens.
   - Botão **"Baixar (.json)"**: exporta a trilha estruturada completa de eventos e erros do motor.
   - Botão de retorno no Step 4: o botão "Voltar" do Step 4 deve retornar ao Step 8 quando o lote foi processado, permitindo rever os logs a qualquer momento.

### Pilar B: Blindagem de "Total da OS" e Mesa Unificada de Vínculo com Órfãos
1. **Trava de Edição no Step 2.5 (`MissingPatioOsEditor.tsx`):**
   - Permitir ao operador editar livremente o `total_value` (Valor Total da OS).
   - **Desabilitar/Bloquear** a digitação arbitrária do campo `paid_value`, exibindo badge informativo: *"O valor pago é liquidado automaticamente vinculando transações de Cartão (Rede), PIX ou Dinheiro no Passo 4."*
   - O saldo remanescente em pátio passa a ser rigorosamente $\max(0, \text{total\_value} - \text{paid\_value})$.
2. **Mesa de Conciliação no Step 4 (`Step1UnregisteredPayments.tsx`):**
   - No Step 4, as transações órfãs (Rede e PIX) já são filtradas por filial.
   - Ao clicar em *"Vincular à OS"*, o `ManualMatchOsModal.tsx` carrega as OSs abertas (`open_balance > 0`) daquela **mesma filial**.
   - Ao selecionar a OS correspondente e confirmar o vínculo, o sistema aciona as RPCs atômicas `link_manual_rede_to_os` e `link_manual_pix_to_os`, que:
     - Gravam `matched_os_number` na transação bancária/maquininha;
     - Incrementam o `paid_value` da OS pelo valor do documento com bloqueio pessimista (`FOR UPDATE`);
     - Atualizam o status da OS para `'pago_parcial'` ou `'finalizada'`;
     - Registram o par em `conciliation_matches`.
   - Adicionar no modal / mesa a ação rápida: **"Quitar via Dinheiro Físico em Loja"** para OSs que foram pagas em dinheiro vivo no balcão, registrando em `cash_value` sem criar vínculos falsos com OFX/Rede.

---

## 3. Impacto nos 5 Pilares Contábeis

| Pilar | Como é Afetado Positivamente |
| :--- | :--- |
| **Pilar 1 (Banco Itaú / OFX)** | Nenhuma transação PIX legítima de cliente é forçada para "Outras Entradas" ou justificativas genéricas no Step 5; todas ganham lastro na OS real. |
| **Pilar 2 (Dinheiro / Cofre)** | Pagamentos em espécie são identificados como dinheiro em loja, refletindo diretamente no cofre físico sem inflar o extrato bancário. |
| **Pilar 3 (A Receber / Cartões Rede)** | Vendas de maquininhas da Rede deixam de ficar órfãs; o total de créditos bate centavo a centavo com o faturamento de cartões. |
| **Pilar 4 (Na Loja / Pátio)** | O saldo de pátio $\sum(\text{total\_value} - \text{paid\_value})$ diminui exatamente no valor das transações liquidadas, eliminando carryovers fantasmas. |
| **Pilar 5 (Faturamento DRE)** | Elimina a duplicidade contábil: a receita é reconhecida uma única vez com sua contrapartida financeira real, garantindo $\text{Diferença Final} = 0,00$. |

---

## 4. Critérios de Aceite

1. **Visibilidade de Logs no Step 8:** Ao término do processamento do motor, a tela permanece no Step 8 exibindo o Hero Banner, as 4 métricas, o resumo do Auto-Healing e o `ImportExecutionTerminal`.
2. **Download e Cópia de Logs:** O operador pode clicar em "Copiar", "Baixar .txt" e "Baixar .json", obtendo o dump completo dos logs sem erros.
3. **Transição Consciente:** O avanço para o Step 4 só ocorre quando o operador clica no botão "Revisar Pagamentos sem OS (Passo 4) →", a menos que tenha marcado a opção de avançar automaticamente.
4. **Edição Segura de OSs:** No Step 2.5 (`MissingPatioOsEditor`), o campo `total_value` é editável e o campo `paid_value` fica protegido contra digitação manual arbitrária.
5. **Vínculo Transacional de Órfãos:** No Step 4 (`Step1UnregisteredPayments`), ao vincular uma transação órfã da Rede ou PIX a uma OS daquela loja, o `matched_os_number` é gravado, o `paid_value` da OS é incrementado atomicamente e a transação sai da lista de pendências.
6. **Integridade de Build & Linter:** `npm run build` e verificações de tipagem TypeScript passam com zero erros.
