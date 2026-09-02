# Design: Padronização Visual e Unificação do Design System do Wizard de Importação e Conciliação (336)

## Arquitetura e Fluxo de Dados

A esteira de importação e conciliação mantém seu fluxo unidirecional atômico com a camada de dados:

```
[UI: CentralImportWizard]
   │
   ├── Step 1 (Upload Dropzone) ──> useCentralImport & Parsers (OFX, XLSX, XLS)
   │
   ├── Step 2 (Mapeamento) ───────> useStoreFileMappings & Aliases
   │
   ├── Step 3 (Preview & Inputs) ─> useTransactions (Bulk Inserts & Auto-Matches)
   │                                  ├─ auto_match_transactions (RPC)
   │                                  ├─ auto_match_saidas (RPC)
   │                                  └─ Gemini 3.5 Flash Lite (AI Matcher)
   │
   ├── Step 4 (Vínculo OS) ───────> ManualMatchOsModal ──> link_manual_pix_to_os / link_manual_rede_to_os (RPCs)
   │
   ├── Step 5 (Justificativas) ───> useCategorizeOrphan ──> resolve_orphan_saida_ofx (RPC)
   │
   ├── Step 6 (Cofre Daniel) ─────> store_cash_vault (Mutação em lote)
   │
   └── Step 7 (Auditoria & Fechar)> useDailyReconciliationSummary ──> close_daily_snapshot (RPC)
                                      └─ Redirecionamento ──> /conciliacao?date=YYYY-MM-DD
```

---

## Padrões de Design System (Dark UI Zinc-950)

### 1. Paleta de Cores e Superfícies
- **Fundo da Página / Modal Tela Cheia:** `bg-zinc-950`
- **Superfície Principal (Cards e Containers):** `bg-zinc-900/60` ou `bg-zinc-900/80` com `border border-zinc-800` ou `border border-white/5` e `backdrop-blur-sm`
- **Superfície Secundária / Sub-cards:** `bg-zinc-950/60` ou `bg-black/30` com `border border-white/5`
- **Bordas Sutis:** `border-zinc-800` (padrão) e `border-zinc-700/60` (foco/hover)

### 2. Stepper Superior Mestre (5 Fases)
- **Container:** `bg-zinc-900/40 border-b border-zinc-800/80 px-6 py-3`
- **Item Inativo:** `text-zinc-500 hover:text-zinc-300 font-medium text-xs` com círculo numérico `bg-zinc-800 text-zinc-400`
- **Item Concluído:** `text-emerald-400 font-semibold text-xs` com círculo `bg-emerald-500/20 text-emerald-400 border border-emerald-500/30` e ícone `Check`
- **Item Ativo:** `text-zinc-100 font-bold text-xs` com círculo `bg-emerald-500 text-zinc-950 font-bold shadow-sm shadow-emerald-500/30` e barra inferior `border-b-2 border-emerald-500`

### 3. Tipografia Numérica e Formatadores
- Todos os números monetários (R$), saldos, volumes e contadores utilizam rigorosamente:
  `font-mono font-bold tabular-nums`
- **Créditos / Entradas:** `text-emerald-400`
- **Débitos / Saídas:** `text-rose-400`
- **Pendências / A Compensar:** `text-amber-300` ou `text-amber-400`
- **Informativos / Sistema:** `text-zinc-100` ou `text-sky-400`

### 4. Botões de Ação Padronizados
- **Primário (Avançar / Salvar / Processar):**
  `bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-md shadow-emerald-950/40 px-4 py-2 rounded-xl transition-all`
- **Secundário (Voltar / Cancelar):**
  `bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 px-4 py-2 rounded-xl transition-all`
- **Ação Perigosa / Reset:**
  `bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg transition-all`

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/CentralImportWizard.tsx`
- **O que muda:**
  - Substituição da badge isolada do cabeçalho pelo **Stepper Superior Fluido** de 5 fases.
  - Conversão de todas as referências a `var(--bg-canvas)`, `var(--bg-surface)`, `var(--color-primary)` para classes Tailwind Zinc-950.
  - Dropzone com layout imersivo `border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/40`.
  - Seção de Inputs Manuais formatada em 4 cards Dark Zinc com badges `Lock`/`Unlock` e cálculo de `Δ Faturamento` em tempo real.
  - Step 8 (Painel de Conclusão) com Hero Card e métricas do lote.

### 2. `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx`
- **O que muda:**
  - Tabela de transações com cabeçalho Dark `bg-zinc-950/80 border-b border-zinc-800`.
  - Formatação de valores em `font-mono tabular-nums text-right`.
  - Badges semânticas para REDE (`CreditCard`) e PIX (`Banknote`).
  - Botão de vínculo com feedback visual de 1 clique.

### 3. `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`
- **O que muda:**
  - Tab navigation elegante para "Entradas Órfãs" e "Saídas Órfãs".
  - Cards de transação em `bg-zinc-900/60 border-zinc-800` com chips de categorias rápidas harmonizados.
  - Toggles destacados para o impacto no DRE (*"Soma ao Contas a Pagar"* vs *"Apenas Conciliar"*).

### 4. `src/components/importacoes/wizard/Step3CashVaultDaniel.tsx`
- **O que muda:**
  - Pergunta central com botões de rádio no padrão Dark UI.
  - Tabela de filiais em trânsito com tipografia `font-mono tabular-nums`.

### 5. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`
- **O que muda:**
  - 5 Header Cards no padrão canônico dos 5 Pilares.
  - Hero Card do Semáforo Contábil com gradiente de tolerância (± R$ 50).
  - Caixa de equação contábil em bloco monospaced escuro.

### 6. `src/components/importacoes/DiagnosticPanel.tsx` & `MissingPatioOsEditor.tsx`
- **O que muda:**
  - Remoção de variáveis CSS legadas e alinhamento com a paleta Zinc-950.

---

## Cenários de Verificação (SCAN ➔ INFER ➔ VERIFY ➔ FIX)

### Cenário 1: Navegação e Upload no Step 0 (Ingestão Global)
- **Estado Inicial:** Acessar `/importacoes` com aba `diario`.
- **Ação:** Visualizar o Stepper Superior, arrastar os arquivos do lote diário e digitar o Odômetro OI.
- **Resultado Esperado:** O Stepper destaca `1. Upload Global`, a dropzone exibe os arquivos carregados com badges coloridas, o badge de `Δ Faturamento` calcula a receita do dia instantaneamente em verde, e o botão "Processar e Conciliar com IA" avança fluidamente para a próxima etapa.

### Cenário 2: Resolução nos Passos 1 a 4 (Vínculo, Justificativas, Cofre e Fechamento)
- **Estado Inicial:** Ingestão processada com sucesso no Step 3.
- **Ação:** Navegar pelos passos 1 (Vínculo OS), 2 (Justificativas), 3 (Cofre Daniel) e 4 (Auditoria dos 5 Pilares).
- **Resultado Esperado:**
  - O Stepper superior acompanha o passo ativo com a barra verde e permite voltar a passos anteriores.
  - No Step 4, os 5 Header Cards exibem os valores consolidados dos 5 pilares com semáforo contábil.
  - Ao finalizar, o snapshot é fechado e a página redireciona para `/conciliacao` com 0 erros de console e 100% de coerência visual.
