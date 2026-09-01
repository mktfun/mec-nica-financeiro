# Proposal: Padronização Visual e Unificação do Design System do Wizard de Importação e Conciliação (336)

## Problema
A esteira do Wizard de Importação e Conciliação Diária (`CentralImportWizard.tsx` e seus passos associados em `src/components/importacoes/wizard/`) é o coração operacional do sistema, conectando a ingestão de extratos OFX, relatórios da Rede, ordens de serviço do ERP e contas a pagar com as rotinas automatizadas de auto-matching e reconciliação dos 5 Pilares.

Embora sua lógica e mutações com o Supabase estejam perfeitamente funcionais e homologadas, a experiência visual acumulou **fragmentação de estilos**:
1. **Ausência de Stepper Superior Contínuo:** No topo do wizard existe apenas uma badge textual isolada com o nome do passo atual, sem que o operador visualize a linha do tempo completa do processo (`0. Upload Global`, `1. Mapeamento & Preview`, `2. Vínculo de OSs`, `3. Justificativas`, `4. Cofre Daniel`, `5. Fechamento & IA`).
2. **Resíduos de Variáveis CSS Legadas:** Uso misto de variáveis antigas (`var(--bg-canvas)`, `var(--bg-surface)`, `var(--color-primary)`, `var(--border-subtle)`) dispersas entre botões, dropzones e cards, criando inconsistência com a estética refinada do restante da aplicação (Dark UI Zinc-950).
3. **Desalinhamento de Tipografia Numérica:** Valores monetários e quantitativos em algumas tabelas e diagnósticos não utilizam `font-mono tabular-nums`, gerando oscilações visuais e desalinhamentos de casas decimais.
4. **Variabilidade de Botões e Badges:** Botões primários, secundários e badges de status possuem paddings, bordas e intensidades de cor variadas entre os 4 passos modulares.

## Solução Proposta (Foco em Reuso, Preservação e Harmonização)
Executar a **padronização visual e de design system integral** de todos os componentes da esteira de importação e conciliação, alinhando-os 1:1 ao design system dos cards de filiais (`StoreCardModulo1.tsx`), da tela de conciliação diária (`ResumoDiaPanel.tsx`), e dos módulos de Pátio e Recebíveis.

**Garantia de Preservação Absoluta:**
- **Zero alteração em regras de negócio, RPCs, endpoints ou fluxos de persistência**: 100% dos hooks (`useCentralImport`, `useBackendConciliacao`, `useCategorizeOrphan`, `useManualMatch`, `useDailySnapshot`), cálculos de odômetro, DRE, auto-matching e mutations no Supabase serão rigorosamente preservados.
- **Transição fluida**: O operador ganha uma barra de progresso / stepper contínuo no topo, cards com fundos harmonizados `bg-zinc-900/60 border-zinc-800`, dropzones imersivas, botões padronizados e tipografia `font-mono tabular-nums` em todos os valores contábeis.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs / Backend Existentes Identificados:**
  - RPCs: `calculate_daily_conciliation`, `auto_match_transactions`, `auto_match_saidas`, `resolve_orphan_saida_ofx`, `link_manual_pix_to_os`, `link_manual_rede_to_os`, `unlink_manual_os_match`, `close_daily_snapshot`.
  - Todas as RPCs e payloads JSON foram validados e serão **REAPROVEITADOS 100% INTACTOS** sem nenhuma alteração estrutural no banco.
- **Componentes e Hooks Existentes Identificados:**
  - `src/components/importacoes/CentralImportWizard.tsx`: Orquestrador mestre `[MODIFY]`.
  - `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx`: Passo 1 (Vínculo de pagamentos órfãos a OS) `[MODIFY]`.
  - `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`: Passo 2 (Justificativas de não-faturamento e saídas) `[MODIFY]`.
  - `src/components/importacoes/wizard/Step3CashVaultDaniel.tsx`: Passo 3 (Conferência de recolhimento de cofre) `[MODIFY]`.
  - `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`: Passo 4 (Auditoria dos 5 Pilares e DRE com Gemini) `[MODIFY]`.
  - `src/components/importacoes/DiagnosticPanel.tsx`: Painel de diagnóstico pré-fechamento `[MODIFY]`.
  - `src/components/importacoes/MissingPatioOsEditor.tsx`: Editor inline de OSs ausentes `[MODIFY]`.
  - `src/components/importacoes/AgentStageItem.tsx`: Item visual dos agentes assíncronos `[MODIFY]`.
  - `src/routes/importacoes.tsx`: Página raiz de importações com abas e histórico de lotes `[MODIFY]`.
  - `src/components/importacoes/MarcoZeroWizard.tsx` & `PurgeDailyModal.tsx`: Modais e cargas de contingência `[MODIFY]`.
- **Justificativa para Artefatos Novos:**
  - Nenhum arquivo novo (`[NEW]`) é necessário. Todo o trabalho será realizado através de refatorações de estilo (`[MODIFY]`) e extensões visuais (`[EXTEND]`) nos componentes existentes.

---

## Contratos de Dados & SQL (Supabase)
- **Nenhuma alteração de schema ou migration de banco é necessária.**
- O contrato de dados entre o frontend e as RPCs permanece estritamente o mesmo:
  * `calculate_daily_conciliation(p_date)`
  * `auto_match_transactions(p_date)`
  * `auto_match_saidas(p_date)`
  * `resolve_orphan_saida_ofx(...)`
  * `link_manual_pix_to_os(...)` / `link_manual_rede_to_os(...)`
  * `close_daily_snapshot(p_date, p_notes, p_metadata)`

---

## API & Componentes (Frontend)

### 1. `CentralImportWizard.tsx` `[MODIFY]` + `[EXTEND]`
- **Novo Stepper Superior Unificado**: Barra de progresso contínua e elegante com 5 fases mestres:
  * `1. Upload Global`: Ingestão multiformato (OFX, Rede, OS, Contas).
  * `2. Mapeamento & Preview`: Conferência de filiais, inputs manuais com trava `Lock` e odômetro $\Delta$.
  * `3. Pagamentos sem OS`: Vínculo inteligente de 1 clique.
  * `4. Justificativas`: Categorização de entradas e saídas com reflexo no DRE.
  * `5. Cofre & Fechamento`: Conferência do Daniel, auditoria dos 5 Pilares e selamento com IA.
- **Harmonização Dark UI Zinc-950**:
  * Substituição de todas as variáveis legadas `var(--bg-surface)` por `bg-zinc-900/60`, `bg-zinc-950`, `border-zinc-800`, `border-white/5`.
  * Dropzone principal com visual imersivo e badges semânticas de arquivos aceitos.
  * Seção de Inputs Manuais em grid de 4 cards com tipografia `font-mono tabular-nums` e travas visuais `Lock`/`Unlock`.
  * Step 8 (Painel de Sucesso) modernizado com Hero Card comemorativo, contadores e logs de execução.

### 2. `Step1UnregisteredPayments.tsx` `[MODIFY]`
- Tabela de transações pendentes no padrão Dark Zinc-950 com cabeçalho `bg-zinc-950/80 border-b border-zinc-800`.
- Valores monetários em `font-mono font-bold tabular-nums text-right`.
- Badges de origem (`CreditCard` para Rede, `Banknote` para PIX) e botões de vínculo com feedback imediato.
- Pill buttons para seleção de filiais em `bg-zinc-900 border-zinc-800 hover:text-white`.

### 3. `Step2NonRevenueJustifications.tsx` `[MODIFY]`
- Tab navigation com indicador sutil e badges de contagem.
- Cards de transações em `bg-zinc-900/60 border-zinc-800` com chips de categorias rápidas harmonizados.
- Toggles de destino contábil destacados com preview explicativo do impacto (*"Soma ao Contas a Pagar"* vs *"Apenas Conciliar"*).

### 4. `Step3CashVaultDaniel.tsx` `[MODIFY]`
- Pergunta central destacada com seletores visuais `[SIM, houve recolhimento]` (Emerald) e `[NÃO]` (Zinc).
- Tabela de valores em trânsito com tipografia `font-mono tabular-nums` e botão de gravação em lote.

### 5. `Step4FinalAuditAndClose.tsx` `[MODIFY]`
- 5 Header Cards no padrão canônico dos 5 Pilares com indicadores superiores coloridos (Cyan, Emerald, Blue, Amber, Purple).
- Hero Card do Semáforo Contábil com gradientes de conformidade (`border-emerald-500/40` para tolerância $\le \text{R\$}~50$, `border-rose-500/40` para divergência).
- Bloco monospaced da Equação de Fechamento em `bg-zinc-950/80 border-zinc-800 font-mono tabular-nums`.

### 6. Componentes Auxiliares (`DiagnosticPanel.tsx`, `MissingPatioOsEditor.tsx`, `AgentStageItem.tsx`, `importacoes.tsx`) `[MODIFY]`
- Purificação de variáveis CSS legadas e alinhamento visual com o padrão Dark UI Zinc-950.

---

## Risco Principal e Mitigação
- **Risco:** Regressão no upload de múltiplos arquivos ou perda de estado dos inputs manuais (como `odometroHoje` ou `contasManual`) ao transitar entre etapas do wizard.
- **Mitigação:** Preservação estrita de todos os hooks, setters, estados locais e handlers de submissão do `CentralImportWizard.tsx`. A refatoração incidirá exclusivamente na camada de apresentação JSX e classes Tailwind, sem renomear props, variáveis de estado ou payloads das mutations.
