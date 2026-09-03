# Proposal: Bifurcação Inicial da Central de Fechamento — Modo Manual Passo a Passo (Sem IA) vs Modo Conversacional Hydra (Com IA) (361)

## Problema
1. **Poluição Visual e Banners Inúteis:** A tela de importação atual exibe banners espúrios como *"Virada de Mês / Pátio sem relatório do ERP? Mistral OCR Vision Integrado"* e badges de carro que geram ruído e poluem a interface corporativa.
2. **Caos da Dropzone Massiva Indiferenciada:** O operador é forçado a soltar até 40 arquivos de uma única vez, misturando extratos, maquininhas, OSs e contas, gerando sobrecarga cognitiva e erros de parsing.
3. **Ausência de Escolha Clara de Modalidade:** O operador não consegue escolher logo na entrada se deseja fazer a conciliação do dia **100% de forma manual e determinística (sem nenhuma IA dando palpites)** ou se deseja **delegar o fechamento para a IA Conversacional (Hydra em Tela Cheia)**.

---

## Solução Proposta (Bifurcação na Entrada e Fluxos Completamente Segregados)

Na aba **Fechamento Diário** (`/importacoes?tab=diario`), a interface apresentará um **Seletor de Modalidade Inicial com Date Picker**, onde o operador escolhe deliberadamente como deseja fechar o dia:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CENTRAL DE FECHAMENTO DIÁRIO: 02/09/2026 [ < ] [ > ] [ Ontem ] [ Hoje ]                              │
│ Escolha como deseja realizar a conciliação do dia:                                                   │
├───────────────────────────────────────────────────┬──────────────────────────────────────────────────┤
│ 🛠️ MODO MANUAL PASSO A PASSO (SEM IA)             │ ⚡ MODO CONVERSACIONAL COM IA (HYDRA)             │
│ • 100% Determinístico e Auditável via Tabelas     │ • Assistente Contábil Hydra em Tela Cheia        │
│ • Você no controle total, fase por fase           │ • A IA assume o motor e apura divergências       │
│ • ZERO consumo de LLM ou chamadas de IA           │ • Investiga PIX órfão e pergunta com cards inline│
│                                                   │                                                  │
│ [ Selecionar Modo Manual ]                        │ [ Abrir Workspace Conversacional ]               │
└───────────────────────────────────────────────────┴──────────────────────────────────────────────────┘
```

---

### Modalidade 1: Modo Passo a Passo Manual (100% Sem IA / Zero LLM)

O operador percorre uma esteira limpa de 4 fases estritamente sequenciais com dropzones dedicadas e tabelas de conferência:

#### **Fase 1: Apenas OSs do Pátio (Faturamento Base)**
- Dropzone aceita **exclusivamente** planilhas de OS (`.xlsx`, `.xls`, `.csv`).
- Exibição direta do componente [`PatioExcelStoreAccordion.tsx`](file:///c:/Users/User/projects/mec-nica-financeiro/src/components/importacoes/patio/PatioExcelStoreAccordion.tsx):
  - 10 filiais em blocos expansíveis com tabela estilo Excel: `OS`, `Total OS`, `Pix`, `Cartão`, `Dinheiro`, `Total Pago`, `Restante`.
  - Popover inline na própria linha (`[ ⚡ Usar restante ]` e `Zerar`) para atualizar ou incluir OSs manuais pendentes uma a uma sem modais invasivos.
  - Gravação determinística via `batch_upsert_patio_os` e alimentação de dinheiro físico em `store_cash_vault`.

#### **Fase 2: Apenas Vendas Rede (Cartões x Balcão)**
- Dropzone aceita **exclusivamente** relatórios de vendas da Adquirente Rede.
- Execução imediata da RPC `match_stage2_rede_os`: cruza vendas de maquininhas contra as OSs da Fase 1 daquela loja.
- Apuração isolada de resíduos:
  - **Sobras de Cartão da Rede:** Vendas capturadas na maquininha sem OS correspondente no balcão (botão manual `[ Vincular a OS ]`).
  - **OSs com Cartão não Passado:** OSs marcadas como cartão onde a venda não apareceu na maquininha.
  - Resolução de ambiguidades com a [`SmartResolutionStrip.tsx`](file:///c:/Users/User/projects/mec-nica-financeiro/src/components/importacoes/wizard/SmartResolutionStrip.tsx) (atalhos `1`, `2`, `Esc`).

#### **Fase 3: Apenas Extratos Bancários (10 OFX Itaú)**
- Dropzone aceita **exclusivamente** os 10 arquivos OFX Itaú.
- **Batimento A (PIX x OS):** Bate os créditos PIX do banco com as OSs de PIX da Fase 1, permitindo vincular PIXs avulsos.
- **Batimento B (Liquidação de Cartões Rede):** Bate os depósitos da Rede que entraram na conta corrente ($D-1$) vs o que ficou agendado como Ativo Circulante a Compensar (`nao_entrou_valor`).

#### **Fase 4: Apenas Contas a Pagar & Conciliação de Saídas**
- Dropzone aceita **exclusivamente** a planilha analítica de Contas a Pagar do ERP.
- Batimento de débitos bancários (saídas OFX) contra títulos a pagar via `auto_match_saidas`.
- Justificativa e classificação manual de saídas não provisionadas (chips de categorias contábeis).
- Registro de receitas extraordinárias corporativas DRE via [`RevenueAdjustmentsCard.tsx`](file:///c:/Users/User/projects/mec-nica-financeiro/src/components/importacoes/wizard/RevenueAdjustmentsCard.tsx) (Aluguel Rei do Módulo, Rateios Holding, Estornos).
- **Homologação:** Scoreboard final dos 5 Pilares e selagem do dia via `close_daily_snapshot`.

---

### Modalidade 2: Modo Conversacional com IA (Hydra em Tela Cheia)

Se o operador escolher o **Modo Conversacional**, o fluxo muda integralmente:
- A tela entra imediatamente no [`ReconciliationChatWorkspace.tsx`](file:///c:/Users/User/projects/mec-nica-financeiro/src/components/conciliacao/chat/ReconciliationChatWorkspace.tsx) em tela cheia (Dark UI Zinc-950).
- A IA assume a condução: solicita os arquivos ou consome a esteira do dia, apura as divergências e conversa com o operador no feed:
  - Identifica PIXs órfãos, vendas de cartão sem baixa e contas não vinculadas.
  - Formula propostas inline no [`InlineDecisionCard.tsx`](file:///c:/Users/User/projects/mec-nica-financeiro/src/components/conciliacao/chat/InlineDecisionCard.tsx) com atalhos de teclado (`1 Confirmar`, `2 Rejeitar`).
  - Atualiza o Live Delta Tracker $\Delta$ em tempo real até atingir a conformidade ($\Delta = \text{R\$}~0,00$) e sela o fechamento.
- No topo do Chat, o operador possui o botão institucional: `[ ↩ Voltar para Escolha de Modo ]` ou `[ 📊 Alternar para Modo Manual ]`.

---

## Investigação e Análise de Reúso (Relatório dos Subagentes)

- **Remoção Cirúrgica:** O banner espúrio *"Virada de Mês / OCR e Carro"* de `CentralImportWizard.tsx` (L2193-L2219) será sumariamente eliminado.
- **Componentes Visuais Reaproveitados:**
  - `PatioExcelStoreAccordion.tsx`: Tabela Excel sanfona para a Fase 1 manual.
  - `SmartResolutionStrip.tsx`: Desempate determinístico por teclado (`1`, `2`, `Esc`) para as Fases 2 e 3 manuais.
  - `RevenueAdjustmentsCard.tsx`: Lançamentos DRE de faturamento extra para a Fase 4 manual.
  - `ReconciliationChatWorkspace.tsx`: Workspace completo para a Modalidade 2 (Com IA).
  - `InlineDecisionCard.tsx`: Cartões de decisão inline sem emojis no chat.
- **Novos Componentes Modulares:**
  - `FechamentoModeSelector.tsx`: Seletor inicial de modalidade com Date Picker.
  - `FechamentoManualWizard.tsx`: Container da esteira manual de 4 etapas lineares (ZERO IA).
  - Submódulos manuais: `Fase1PatioOsReview.tsx`, `Fase2RedeVsOsReview.tsx`, `Fase3OfxReconciliation.tsx`, `Fase4ContasVsSaidasReview.tsx`.

---

## Contratos de Dados & SQL (Supabase)

### 1. Tabela de Sessões da Esteira (`reconciliation_pipeline_sessions`)
Persiste a etapa ativa (`current_step: 1..4`), os arquivos importados e o modo escolhido, garantindo que o operador possa recarregar a página (`F5`) sem perder dados.

### 2. RPCs Especializadas
- `public.batch_upsert_patio_os`: Merge defensivo e persistência de OSs com suporte a inclusão pontual na Fase 1.
- `public.match_stage2_rede_os`: Pré-matching determinístico isolado entre vendas Rede e OSs de balcão (Fase 2).
- `public.get_pipeline_session_state`: Hidratação da esteira manual ou conversacional no F5.
- `public.save_pipeline_step_progress`: Gravação de progresso entre as fases manuais.
- `public.close_daily_snapshot`: Selagem unificada de fechamento homologado para ambas as modalidades.

---

## Risco Principal e Mitigação
- **Risco:** Discrepância contábil entre fechar pelo Modo Manual ou pelo Modo com IA.
- **Mitigação:** Ambos os modos utilizam **exatamente a mesma SSOT no PostgreSQL**:
  1. A apuração dos 5 Pilares reside exclusivamente na RPC `get_daily_reconciliation_summary(p_date, true)`.
  2. O fechamento diário converge para a mesma RPC `close_daily_snapshot`.
  3. O Modo Manual possui ZERO chamadas para a Edge Function de IA (`ai-chat`), garantindo determinismo absoluto, sem custos de API ou riscos de alucinação.
