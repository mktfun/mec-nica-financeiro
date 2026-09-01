# Proposal: Simplificação do Step 3 e Integração de OSs Ausentes no Step 4 (334)

## Problema
1. **Poluição Visual no Step 3:** A tela de conferência inicial (Passo 3) contém excesso de informações que o operador não utiliza na rotina diária: tabela gigante de previsão por loja, painel de diagnóstico forense, tabela pesada de OSs ausentes e inspetor de JSON de debug.
2. **Fragmentação de Ajustes de OS:** A conferência de OSs antigas/ausentes do pátio ficava isolada no Step 3, separada da tela de vinculação de pagamentos de Cartão e PIX (Step 4). O fluxo fica muito mais prático e coeso se o operador auditar tanto as OSs do pátio quanto os pagamentos órfãos em um único ambiente integrado no Step 4.

## Solução Proposta (Foco em Reuso e Correção)
Vamos modificar `CentralImportWizard.tsx` e `Step1UnregisteredPayments.tsx` [MODIFY]:
- **Enxugamento Drástico do Step 3:**
  - Manter apenas o card moderno e limpo dos **Inputs Manuais Globais** (Odômetro OI com cálculo dinâmico de $\Delta$ Faturamento, Dinheiro MP, A Receber e Contas a Pagar) e a **Data-base**.
  - Remover a tabela de previsão multi-loja, o `DiagnosticPanel` e o JSON inspector do Step 3.
  - Botão limpo: **"Avançar para Conciliação de OSs & Pagamentos (Passo 4) →"**.
- **Integração de OSs Ausentes no Step 4 (`Step1UnregisteredPayments.tsx`):**
  - Adicionar navegação por abas no Step 4:
    - **Aba 1: Pagamentos sem Lançamento na OS** (Transações de Cartão Rede e PIX sem OS).
    - **Aba 2: OSs do Pátio Pendentes de Baixa** (`MissingPatioOsEditor` integrado, permitindo ajustar valores pagos e status de OSs anteriores diretamente).
  - Todas as edições de OSs são preservadas no estado do Wizard e persistidas no banco no momento do fechamento final (Step 7/8).

## Investigação e Análise de Reuso
- **Componentes Existentes:** `CentralImportWizard.tsx`, `Step1UnregisteredPayments.tsx`, `MissingPatioOsEditor.tsx`. Reutilização de 100% dos componentes existentes sem criar estruturas novas.
- **Contrato de Dados:** Preserva o array `missingOsList` e a interface `MissingPatioOsEdit`.

## Risco Principal e Mitigação
- **Risco:** Perda de dados editados na tabela de OSs ausentes ao alternar entre abas no Step 4.
- **Mitigação:** O estado de `missingOsList` permanece no componente pai (`CentralImportWizard.tsx`), garantindo persistência contínua na memória até a gravação no banco.
