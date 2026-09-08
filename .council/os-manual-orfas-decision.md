# 🏛️ Conselho Técnico Antigravity: Parecer Arquitetural & Deliberação

**Data:** 08/09/2026  
**Status:** DELIBERADO & APROVADO POR UNANIMIDADE  
**Spec Vinculada:** `326-controle-logs-motor-e-vinculo-os-manual-transacoes-orfas`  
**Participantes:** O Pragmático, O Cético, O Arquiteto, O Advogado do Diabo  

---

## 1. O Problema Concreto Apresentado pelo Operador

1. **Auto-Avanço Indesejado do Motor (Step 8):**
   Ao disparar o processamento do motor, assim que a gravação e o auto-healing terminam, o Wizard pula automaticamente e sem aviso do Step 8 para o Step 4 (`setStep(4)` incondicional na linha 1944 de `CentralImportWizard.tsx`).
   - O operador **não consegue ver os logs finais**, não consegue copiar o console, não consegue baixar os logs em `.txt` ou `.json`, nem analisar as métricas do lote e os deltas periciais.

2. **Divergência Contábil por "Total Pago" Digitado Manualmente:**
   No cadastro/atualização de OSs manuais e carryover de pátio (Step 2.5 / `MissingPatioOsEditor.tsx`), existe um `<input type="number">` solto para `paid_value`.
   - Se o usuário digita um valor pago na mão para uma OS que teve pagamentos em cartão (Rede) ou PIX, a transação bancária/adquirente real continua com `matched_os_number = NULL` (órfã).
   - Isso gera duplicidade de faturamento nos 5 Pilares (Pilar 5 soma o `paid_value` da OS e o Step 5 soma a transação bancária órfã se for justificada), ou impede o fechamento do dia com reconciliação zerada.
   - O usuário precisa atualizar **APENAS o Total da OS**, e o **Total Pago** deve vir dos pagamentos daquela mesma loja que estão órfãos (Rede, PIX, dinheiro).

---

## 2. O Debate sob as 4 Personas

### 🛠️ Persona 1: O Pragmático (Reuso Máximo e Menor Atrito)
* **Posição:** Voto enfático na **Opção A (Aprimoramento do Step 4)**.
* **Argumentação:** O Step 4 (`Step1UnregisteredPayments.tsx`) já tem toda a listagem de pagamentos órfãos separada por filial, já renderiza badges de REDE e PIX, e já aciona o `ManualMatchOsModal.tsx`.
* Criar uma etapa nova antes do match (Opção B) é desperdício de engenharia e polui ainda mais o Wizard. Basta enriquecer o Step 4 com uma visualização integrada ou permitir que o modal de match selecione qualquer OS em aberto daquela mesma filial, usando as RPCs atômicas já prontas (`link_manual_rede_to_os` e `link_manual_pix_to_os`).

### 🧐 Persona 2: O Cético (Riscos de Integridade e 5 Pilares)
* **Posição:** Aprovação da Opção A com **trava rigorosa** no Step 2.5.
* **Argumentação:** Executar amarração de transações *antes* do motor rodar é uma aberração: o motor determinístico roda por NSU, código de autorização e centavos. Fazer o usuário amarrar na mão antes do motor é fazê-lo perder tempo e correr risco de race conditions.
* O maior perigo aos 5 Pilares é o operador digitar livremente `paid_value` na mão. O `paid_value` precisa ser derivado exclusivamente das transações liquidadas. Travar o `paid_value` manual no Step 2.5 elimina a raiz de 90% dos erros de fechamento.

### 📐 Persona 3: O Arquiteto (Máquina de Estados e Fluxo Unidirecional)
* **Posição:** Consistência e previsibilidade de ciclo de vida.
* **Argumentação:** O pipeline deve ser estritamente sequencial:
  $$\text{Ingestão de OSs/Extratos} \longrightarrow \text{Auto-Match Batch} \longrightarrow \text{Revisão de Logs no Terminal} \longrightarrow \text{Mesa de Órfãos (Step 4)} \longrightarrow \text{Justificativas} \longrightarrow \text{Fechamento}$$
* O Step 8 deve respeitar o princípio de agência do operador: **o robô informa o resultado e aguarda a decisão humana de avançar**.
* As transações órfãs só passam a existir oficialmente após a execução do motor. Portanto, a reconciliação manual pertence inequivocamente ao Step 4.

### 😈 Persona 4: O Advogado do Diabo (A Desconstrução da Ilusão)
* **Posição:** Extirpar de vez a digitação arbitrária de "Total Pago".
* **Argumentação:** *"Total Pago não se digita, se comprova."* Um sistema contábil que permite digitar "Total Pago" sem apontar o extrato bancário ou o lote de cartão é uma planilha glorificada.
* O usuário deve editar livremente o `total_value` (orçamento do serviço no pátio). O `paid_value` deve ser $\sum \text{créditos vinculados}$. Se o cliente pagou em notas físicas na oficina sem passar pelo banco, existe o método explícito *"Liquidar via Espécie em Loja"*, que sincroniza diretamente com o cofre físico (Step 6).

---

## 3. Decisão de Consenso e Diretrizes de Engenharia

1. **Controle Total de Logs no Step 8:**
   - **Remover** o salto automático incondicional `setStep(4)` na conclusão do motor.
   - Chamar `setSaveFinished(true)`, exibindo os cards de métricas consolidadas, o banner de Auto-Healing e o terminal de logs completo.
   - Implementar no `ImportExecutionTerminal.tsx`:
     - Botão **"Copiar Logs"** (manter e aprimorar);
     - Botão **"Baixar Logs (.txt)"**;
     - Botão **"Baixar Logs (.json)"**;
     - Toggle/Checkbox **"Avançar automaticamente após conclusão"** (default `false`);
     - Botão de ação explícito: **"Revisar Órfãos & Diferença (Passo 4) →"**.

2. **Blindagem do "Total da OS" no Step 2.5 (`MissingPatioOsEditor.tsx`):**
   - Permitir edição de `total_value` (Valor Total da OS).
   - Bloquear a edição manual livre de `paid_value`, orientando o operador com tooltip explicativo: *"O valor pago é amortizado automaticamente vinculando transações de Cartão (Rede), PIX ou Dinheiro no Passo 4."*
   - O saldo remanescente da OS no pátio passa a ser rigorosamente `total_value - paid_value`.

3. **Mesa de Conciliação no Step 4 (`Step1UnregisteredPayments.tsx` & `ManualMatchOsModal.tsx`):**
   - Transações órfãs (Rede e PIX) listadas por filial.
   - Ao abrir o modal de vínculo para uma transação de uma filial, listar todas as OSs com saldo em aberto (`open_balance > 0`) daquela **mesma filial**.
   - Ao confirmar o match, acionar as RPCs atômicas `link_manual_rede_to_os` e `link_manual_pix_to_os`, que gravam o `matched_os_number`, incrementam o `paid_value` da OS e atualizam seu status para `pago_parcial` ou `finalizada` com bloqueio pessimista (`FOR UPDATE`).
   - Disponibilizar na mesa/modal a ação rápida para OSs com saldo: *"Quitar via Dinheiro Físico em Loja"*, registrando `cash_value` sem gerar duplicidade com OFX/Rede.
