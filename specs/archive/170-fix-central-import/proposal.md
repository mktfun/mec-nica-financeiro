# Proposal: Fix Central Import Store Mapping Bugs

## 1. Problema Identificado
O usuário relatou que a importação do "Dia 11" (via `CentralImportWizard`) gerou valores zerados para todas as métricas de loja (Faturamento Banco, Maquininha, OS, Previsto), embora as métricas globais preenchidas manualmente (Dinheiro MP, A Receber) tenham funcionado.

Após auditoria detalhada no código, identificamos duas causas raiz:
1. **Pulo do Step 2 (Mapeamento)**: Quando o `AgentRunnerModal` retorna sucesso com `fallback: true` (comum ao usar LLM para OCR/extração), o callback `handleCloudDataSuccess` estava invocando `setStep(3.5)` diretamente. Isso fazia o wizard pular completamente a etapa 2 (Mapeamento de Lojas), deixando o state `mapping` vazio.
2. **Perda de Mapeamento Inicial**: O state `mapping` em `useUnifiedStoreMapping` (linha 41) estava sendo inicializado sempre como um objeto vazio `{}`, ignorando o histórico salvo no `localStorage` sob a chave `@mecanica/unified-mappings`. Como resultado, se o Step 2 fosse pulado (ou até mesmo acessado sem o usuário remarcar cada loja), os aliases de arquivo não casavam com os IDs das lojas.

Com `mapping` vazio, filtros como `mapping[r.storeAlias] === storeId` falhavam universalmente, retornando `0` para todas as agregações de loja.

## 2. Impacto
- **Corrupção de Conciliação**: Conciliações geradas sob essas condições registram 0 de faturamento, gerando falsas divergências colossais (ex: diferença de R$ 254.981,32).
- **UX Quebrada**: O usuário é forçado a remapear manualmente todos os arquivos a cada importação, caso não use o fallback.
- **Inconsistência de Fluxo**: Mapeamentos já definidos em sessões anteriores (e salvos no disco) eram solenemente ignorados.

## 3. Solução Proposta
1. **Inicializar o State com LocalStorage**: Modificar o hook `useUnifiedStoreMapping` para ler imediatamente a chave `@mecanica/unified-mappings` no mount, tentando inferir (fuzzy ou direct match) os IDs das lojas a partir dos nomes salvos e da lista de lojas reais do Supabase.
2. **Corrigir Roteamento do Wizard**: Alterar `handleCloudDataSuccess` para que, mesmo em caso de `fallback: true`, o fluxo garanta a passagem pela validação do Mapeamento de Lojas (Step 2) ou que o Mapping seja injetado e auto-validado antes de seguir para as etapas finais.
3. **Bloqueio de Preview Vazio**: Adicionar um safeguard no Step 3 (Preview) que avise o usuário "Nenhuma loja foi mapeada" em vez de apenas não exibir nada e prosseguir.
