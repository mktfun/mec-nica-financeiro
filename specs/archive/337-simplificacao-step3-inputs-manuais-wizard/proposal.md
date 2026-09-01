# Proposal: Simplificação e Foco do Step 3 do Wizard de Importação nos Inputs Manuais (337)

## Problema
Atualmente, no Step 3 do Wizard de Importação (`CentralImportWizard.tsx`), a tela que antecede o disparo do motor de conciliação e auto-matching com IA está excessivamente sobrecarregada e fragmentada. Nela constam:
1. Tabela/editor de OSs ausentes do pátio (`MissingPatioOsEditor`), exigindo atenção manual prematura antes mesmo de rodar o motor automático de conciliação.
2. Grid massivo de "Previsão de Movimentações por Filial" (cards repetitivos de OS, Maquininha e OFX para cada uma das 10 lojas) que geram ruído visual e já são detalhados nos passos de resolução e na auditoria final.
3. Card de "Contas a Pagar Analíticas Importadas".
4. Painel de diagnóstico preliminar de histórico.

Essa sobrecarga atrasa a operação do usuário. O propósito essencial desta etapa (Step 3) é **puramente coletar e travar os 4 inputs manuais do dia** (Odômetro OI Acumulado, Dinheiro MP, A Receber e Contas a Pagar) e a **Data Base**, fornecendo a massa de dados canônica necessária para que o motor de reconciliação (RPCs e IA Gemini) processe tudo e abra as esteiras focadas de resolução (Step 4 a 7).

## Solução Proposta (Foco em Reuso, Despoluição e Clareza Operacional)
1. **Despoluir o Step 3 de Ingestão e Inputs Manuais (`CentralImportWizard.tsx`):**
   - **Remover** o bloco de edição de OSs ausentes (`<MissingPatioOsEditor>`) desta tela prévia.
   - **Remover** o bloco de "Previsão de Movimentações por Filial" (cards individuais por filial e aviso anti-zero de mapeamento no preview).
   - **Remover** o banner de "Contas a Pagar Analíticas Importadas".
   - **Remover** o `<DiagnosticPanel />` do Step 3 para evitar alertas prematuros antes da conciliação.
   - **Preservar e Destacar** os 4 Inputs Manuais Críticos do Fechamento (`Odômetro Hoje`, `Dinheiro MP`, `A Receber`, `Contas a Pagar`) com trava visual (`isManualLocked`), cálculo instantâneo do $\Delta$ Faturamento e Data Base da Conciliação.
   - **Preservar** o Resumo Macro Global no topo (3 cards compactos: Total OSs, Maquininhas e Extratos OFX) para conferência rápida de que os arquivos foram carregados com sucesso.
   - **Preservar** o Inspetor JSON colapsável e o fluxo de botões de avanço ("Processar e Conciliar com IA →" / "Gravar Direto").

2. **Preservação de Integridade Contábil e de Dados:**
   - Nenhuma variável, hook (`useCentralImport`, `useStores`, etc.) ou estado que alimenta o `handleConfirm`, `handleSave` ou as etapas seguintes (Step 4 `Step1UnregisteredPayments`, Step 5 `Step2NonRevenueJustifications`, Step 6 `Step3CashVaultDaniel`, Step 7 `Step4FinalAuditAndClose`) será corrompido ou removido.
   - As OSs continuam sendo importadas e salvas deterministicamente via `savePatioOsAndReceivables`.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Componentes / Hooks Existentes:**
  - `CentralImportWizard.tsx`: Componente central da esteira. O bloco `step === 3` (linhas 2162 a 2542) será refatorado para remover o JSX redundante (124+ linhas de renderização dispensável).
  - `MissingPatioOsEditor.tsx`: Permanece no repositório como componente especializado para uso em fluxos dedicados.
  - `Step1UnregisteredPayments.tsx`, `Step2NonRevenueJustifications.tsx`, `Step3CashVaultDaniel.tsx`, `Step4FinalAuditAndClose.tsx`: Já padronizados no Dark UI Zinc-950, continuam recebendo normalmente os dados consolidados pelo motor.
- **Tabelas / RPCs do Backend:**
  - Nenhuma alteração de schema ou RPC necessária. O payload enviado ao backend via `handleConfirm` permanece 100% idêntico e preservado.

## Contratos de Dados & SQL (Supabase)
- Nenhuma alteração em tabelas, colunas ou RPCs.

## API & Componentes (Frontend)

### `[MODIFY] CentralImportWizard.tsx`
- **Remover do JSX do `step === 3`**:
  - Invocação de `<MissingPatioOsEditor />`
  - Invocação de `<DiagnosticPanel />`
  - Bloco `<h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">Previsão de Movimentações por Filial</h3>`
  - Bloco de aviso `Object.keys(mapping).length === 0`
  - Bloco `{stores.map(store => ...)}` de previsão por filial
  - Bloco `{results.contasPagarResults && ...}` de contas analíticas
- **Refinar o Card de Inputs Manuais**:
  - Layout focado, limpo, Dark UI Zinc-950 (`bg-zinc-900/60 border-zinc-800 rounded-2xl`).
  - Destaque claro para a Data Base da Conciliação e botão primário em esmeralda `bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl`.

## Risco Principal e Mitigação
- **Risco:** Alguma variável de cálculo ou dependência de `handleConfirm` ser deletada acidentalmente junto com o JSX removido.
- **Mitigação:** Análise profunda de dependências executada pelos subagentes comprovou que as variáveis inline do `.map` de lojas eram locais e que os inputs manuais e dados de arquivos usam estados próprios (`odometroHoje`, `manualDinheiroMp`, `manualAReceber`, `contasManual`, `targetDate`, `mapping`, `results`). O build gate (`npm run build`) validará a compilação completa.
