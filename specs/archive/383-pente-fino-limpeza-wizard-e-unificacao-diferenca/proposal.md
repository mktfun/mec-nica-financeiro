# Proposal: Pente Fino, Limpeza Visual do Wizard e Unificação da Diferença Contábil (383)

## Problema
Após auditoria visual dos fluxos de importação e conciliação, o operador identificou 3 grupos de inconsistências e ruídos visuais graves sinalizados em vermelho nas capturas de tela:

1. **Step 1 (Preview do Wizard - Imagem 1):**
   - **Cards de Resumo do Topo:** Os cards *Total OS (Recebimentos do Dia)* (mostrando R$ 0,00 incorreto), *Maquininha (Rede Líquido)* e *Saldo Total Bancário (OFX)* induzem a erro, não têm valor operacional para o usuário e poluem a visão antes da conferência.
   - **Card "Receitas Extras & Ajustes DRE":** Exibido de forma prematura e vazia no meio da tela antes do operador passar pelo Step 2 de justificativas.
   - **Inspetor de Conciliação (Payload JSON):** Elemento de debug exposto na interface do usuário final, ocupando espaço desnecessário.

2. **Tela de Conclusão / Pós-Gravação (Imagem 2):**
   - **4 Cards de Métricas do Lote:** (*OSs Gravadas*, *Vendas Rede*, *Extratos OFX*, *Data Base*) repetem contagens irrelevantes que poluem a tela.
   - **Banner de "Auditoria Pericial & Auto-Healing":** Projeta mensagens alarmantes de *"Divergência Residual - Delta Inicial: R$ 80.622,28 ➔ Delta Final: R$ 80.622,28 (3 iterações)"*, assustando o operador antes mesmo de ele ter justificado as transações órfãs.

3. **Step 4 (Fechamento Definitivo - Imagem 3) vs Painel de Conciliação:**
   - **Jargões Esotéricos Confusos:** A tela foi poluída com blocos experimentais *"Canal 1: Tesouraria Líquida Real"* e *"Canal 2: Balanço de Produção & WIP (Pátio ΔP4)"*, além de cards de 5 pilares com títulos técnicos que confundem o operador.
   - **Discrepância na Diferença Final Apurada:** No Step 4 do Wizard, a diferença calculada e exibida divergia do cálculo canônico do Painel de Conciliação (`ResumoDiaPanel.tsx` / `get_daily_reconciliation_summary`) devido a fórmulas desarmônicas e omissão/duplicação de juros de rede.
   - **Textos e Dicas Incoerentes:** Textos de rodapé indicavam passos errados (*"clique em Voltar para justificar despesas extras no Passo 4 ou ajustar vínculos no Passo 3"*), desorientando a rotina do usuário.

## Solução Proposta (Foco em Reuso e Correção)
1. **Limpeza Cirúrgica do Step 1 (`CentralImportWizard.tsx`):**
   - Eliminar os 3 cards do topo (*Total OS*, *Maquininha*, *Saldo Bancário*).
   - Eliminar o bloco `RevenueAdjustmentsCard` redundante do Step 1 (ajustes ocorrem estritamente no Step 2 / Justificativas).
   - Eliminar o Accordion do *Inspetor de Conciliação (Payload JSON)*.
   - Manter a tela 100% limpa, focada exclusivamente no card essencial: **Valores Manuais do Dia** (Odômetro, Dinheiro MP, A Receber, Contas a Pagar).

2. **Limpeza da Tela de Sucesso Pós-Importação (`CentralImportWizard.tsx`):**
   - Eliminar o grid dos 4 cards (*OSs Gravadas, Vendas Rede, Extratos OFX, Data Base*).
   - Eliminar o banner ruidoso de *Auditoria Pericial & Auto-Healing* com deltas assustadores.
   - Manter uma confirmação minimalista, elegante e de alto contraste: ícone de sucesso, texto objetivo e botões diretos de ação (`[Revisar Pagamentos sem OS →]` e `[Ir para a Conciliação do Dia →]`).

3. **Harmonização Total do Step 4 (`Step4FinalAuditAndClose.tsx`):**
   - Eliminar completamente os blocos *Canal 1* e *Canal 2*.
   - Estruturar a tela seguindo rigorosamente o design já consagrado e familiar de `ResumoDiaPanel.tsx`:
     - **Grid dos 4 Ativos de Caixa:** Saldo Bancos + Cofre, Dinheiro MP, A Receber, Na Loja OS (Pátio).
     - **Grid de Fluxo & DRE:** Caixa Atual, Caixa Anterior, Fluxo de Caixa, Faturamento do Dia (OI + Ajustes), Valor Disponível para Contas, Contas a Cobrir (Contas + Juros).
     - **Hero Placar de Diferença Final:** Rigorosamente espelhado no cálculo oficial da RPC e do Painel Diário (`diferencaFinal = valorDispContas - subtotalContas`).
   - Corrigir referências de texto para os passos reais do wizard.

## Investigação e Análise de Reuso
- **Componentes Existentes Identificados:**
  - `src/components/importacoes/CentralImportWizard.tsx` `[MODIFY]`: Contém as marcações das Imagens 1 e 2.
  - `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` `[MODIFY]`: Contém a tela da Imagem 3.
  - `src/components/conciliacao/ResumoDiaPanel.tsx` `[REFERENCE]`: SSOT visual da empresa para a conciliação diária dos 5 pilares, fluxo contábil e diferença final.
- **Backend / RPCs:**
  - `get_daily_reconciliation_summary` e `close_daily_snapshot` já fornecem os dados canônicos; nenhuma nova RPC necessária.

## Contratos de Dados & SQL (Supabase)
- Nenhuma migration de schema necessária. O escopo é 100% de higienização de UX/UI, eliminação de ruído e unificação matemática visual entre `/importacoes` e `/conciliacao`.

## API & Componentes (Frontend)
- `CentralImportWizard.tsx`:
  - Remoção de linhas 2867-2907 (Cards de resumo topo).
  - Remoção de linhas 3187-3195 (`RevenueAdjustmentsCard`).
  - Remoção de linhas 3201-3260 (Inspetor JSON).
  - Remoção de linhas 3410-3473 (Cards de métricas e Auto-healing da tela de sucesso).
- `Step4FinalAuditAndClose.tsx`:
  - Remoção dos blocos Canal 1 e Canal 2.
  - Reorganização dos blocos em Ativos de Caixa vs Fluxo/DRE vs Placar de Diferença harmonizado com `ResumoDiaPanel`.

## Risco Principal e Mitigação
- **Risco:** Quebra de referências de props ou variáveis removidas (ex: `copiedJson`, `totalOs`, `autoHealingData`).
- **Mitigação:** Manter os cálculos em memória apenas se forem consumidos por etapas seguintes do wizard, limpando estados e imports órfãos; rodar o Build Gate (`npm run build`) para assegurar integridade de compilação TypeScript.
