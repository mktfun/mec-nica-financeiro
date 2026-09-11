# Spec Plan: Pente Fino, Limpeza Visual do Wizard e Unificação da Diferença Contábil (383)

## Tarefas de Implementação

### Fase 1: Limpeza Visual do Step 1 (Preview do Wizard)
- [x] 1.1 Em `src/components/importacoes/CentralImportWizard.tsx`, remover os 3 cards de resumo do topo (*Total OS*, *Maquininha*, *Saldo Total Bancário*) de dentro de `step === 3`.
- [x] 1.2 Em `CentralImportWizard.tsx`, remover a invocação de `RevenueAdjustmentsCard` de dentro do card de Valores Manuais do Step 1.
- [x] 1.3 Em `CentralImportWizard.tsx`, remover o acordeão do Inspetor de Conciliação (Payload JSON) e seu botão de cópia.

### Fase 2: Limpeza Visual da Tela de Conclusão Pós-Gravação
- [x] 2.1 Em `CentralImportWizard.tsx`, remover o grid de 4 cards de métricas do lote (*OSs Gravadas*, *Vendas Rede*, *Extratos OFX*, *Data Base*) da view `saveFinished`.
- [x] 2.2 Em `CentralImportWizard.tsx`, remover o banner de *Auditoria Pericial & Auto-Healing* com deltas e iterações da view `saveFinished`.
- [x] 2.3 Garantir layout responsivo e limpo para os botões de ação final.

### Fase 3: Higienização e Unificação da Diferença no Step 4
- [x] 3.1 Em `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`, remover os blocos de *Canal 1 (Tesouraria Líquida Real)* e *Canal 2 (Balanço de Produção WIP ΔP4)*.
- [x] 3.2 Reorganizar a apresentação dos cards de Ativos de Caixa e do Fluxo Contábil & DRE em harmonia com `ResumoDiaPanel.tsx`.
- [x] 3.3 Assegurar unificação centesimal exata da fórmula de Diferença Final Apurada entre Step 4 e `ResumoDiaPanel`.
- [x] 3.4 Corrigir o texto de dica de navegação removendo referências incoerentes a números de passos.

### Fase 4: Build Gate e Visual QA
- [x] 4.1 Executar compilação TypeScript com `npm run build` validando ausência de erros de variáveis órfãs.
- [x] 4.2 Executar script Playwright capturando screenshots do Step 1, Tela de Sucesso e Step 4.
- [x] 4.3 Inspecionar visualmente os screenshots e confirmar conformidade estética com o Dark UI Zinc-950.
