# Spec 422 — Proposta: Paridade Contábil Total e Drilldown Interativo no Sandbox de Conciliação (Zero DB)

## 1. Problema Diagnosticado
Na implementação da Spec 421, a tela de conciliação simulada (`/teste/import` -> Aba 2) gerou números financeiros totalmente distorcidos em relação à produção real (conforme evidenciado na captura do operador):
1. **Caixa Anterior = R$ 0,00:**
   O sintetizador (`sandboxCalculator.ts`) e o `ResumoDiaPanel` não integraram o snapshot imediatamente anterior (D-1) como baseline read-only. Como o `Caixa Anterior` virou `0,00`, o `Fluxo de Caixa` saltou para `+R$ 106.787,33`, o `Valor Disponível para Contas` virou `-R$ 75.586,36` e a `Diferença Final` explodiu para `-R$ 132.456,53`.
2. **A Receber = R$ 0,00:**
   O valor de `A Receber` foi calculado apenas pelas OSs do dia sem herdar o saldo acumulado de títulos em aberto do D-1 (`previousSnapshot.a_receber_manual` ou tabela `receivables`).
3. **Drilldowns Interativos Desconectados:**
   Os botões nos cards (`Cofre ↗`, `Ver OSs ↗`, `Ver Títulos ↗`, `Ver Detalhes ↗`, `Ver Contas ↗`) abrem modais de produção que consultam o banco de dados Supabase (onde os dados simulados não foram gravados), resultando em telas vazias ou dados de datas antigas.
4. **Falta de Persistência de Ajustes Manuais no Sandbox:**
   Ajustes de odômetro, faturamento e contas na aba de conciliação simulada não atualizavam a sessão no `localStorage`.

## 2. Solução Proposta
1. **Leitura Automática do Baseline D-1 (Estritamente Read-Only via SELECT):**
   - Ao calcular a simulação para `targetDate`, carregar do Supabase o snapshot consolidado do dia anterior (`daily_snapshots` onde `date < targetDate ORDER BY date DESC LIMIT 1`).
   - Carregar o saldo acumulado de títulos em aberto (`receivables` pendentes) e o odômetro anterior.
   - Zero mutações: apenas consultas idempotentes de leitura.
2. **Correção Matemática Estrita dos 5 Pilares no `sandboxCalculator.ts`:**
   - `caixa_anterior`: herda o `caixa_atual` do D-1 (ex: R$ 257.321,43).
   - `a_receber`: herda o saldo acumulado de títulos em aberto de D-1 (ex: R$ 6.929,67) + novos títulos extraídos das OSs do dia.
   - `dinheiro_mp`: herda o valor do D-1 se não for informado manualmente.
   - `Fluxo de Caixa`: `Caixa Atual - Caixa Anterior`.
   - `Valor Disp. Contas`: `Faturamento - Fluxo Caixa`.
   - `Diferença Final`: `|Valor Disp. Contas| - Subtotal Contas (Contas + Juros REDE)`.
3. **Modais de Drilldown Nativos no Sandbox:**
   - Criar modais e drawers interativos no Sandbox Hub que exibem a decomposição exata dos dados em memória:
     - `SandboxCashVaultModal`: Extrato do cofre (dinheiro por OS e por loja) com botão de simular recolhimento Daniel.
     - `SandboxPatioModal`: Todas as OSs abertas no pátio com total restante e comparativo com D-1.
     - `SandboxReceivablesModal`: Títulos a receber acumulados por filial e cliente.
     - `SandboxFaturamentoModal`: Ordens de serviço concluídas que compõem o faturamento do dia.
     - `SandboxContasModal`: Relação de despesas/contas a pagar importadas.
4. **Edição e Recálculo Reativo na Aba 2:**
   - Permitir ao operador ajustar valores manuais (odômetro, dinheiro MP, contas) com botão "Salvar Ajustes no Sandbox", persistindo a atualização no `localStorage` e recalculando os cards instantaneamente.

## 3. Skills Especializadas Aplicadas
- `skills/frontend-design-pro`: Modais com foco, escape key, tokens Zinc-950, ausência de classes arbitrárias.
- `skills/backend-patterns`: Funções puras determinísticas para apuração matemática dos 5 pilares contábeis.
- `skills/database`: Consultas read-only (`SELECT`) sem disparo de transações ou mutações.
- `skills/security`: Isolamento total dos dados de teste no cliente (`localStorage`).

## 4. Contratos de Dados e Estruturas

```typescript
export interface SandboxDrilldownState {
  isCashVaultOpen: boolean;
  isPatioOpen: boolean;
  isReceivablesOpen: boolean;
  isContasOpen: boolean;
  isFaturamentoOpen: boolean;
  isSaldoBancosOpen: boolean;
}

export interface BaselineD1Snapshot {
  date: string;
  caixa_anterior: number;
  faturamento_anterior: number;
  odometro_anterior: number;
  a_receber_acumulado: number;
  dinheiro_mp: number;
  total_patio_anterior: number;
}
```

## 5. Arquivos Afetados

### [Arquivos Existentes Reutilizados/Modificados]
1. `src/lib/sandbox/sandboxCalculator.ts`:
   - Integrar `baselineD1` no cálculo de `caixa_anterior`, `a_receber`, `faturamento` e `fluxo_caixa`.
2. `src/components/importacoes/CentralImportWizard.tsx`:
   - Passar o snapshot D-1 para `buildSimulatedDailySummary`.
3. `src/routes/teste.import.tsx`:
   - Integrar os modais de drilldown simulados nos cliques dos botões de cada card (`Cofre ↗`, `Ver OSs ↗`, `Ver Títulos ↗`, etc.).
   - Carregar e repassar `previousSnapshot` na inicialização da simulação.

### [Arquivos Novos]
1. `src/components/sandbox/modals/SandboxDrilldownModals.tsx`:
   - Modais de detalhamento em memória para Cofre, Pátio OS, Recebíveis, Faturamento e Contas.

## 6. Plano de Rollback
Reverter as modificações em `src/lib/sandbox/sandboxCalculator.ts`, `src/routes/teste.import.tsx` e `CentralImportWizard.tsx`. Nenhuma mutação de banco de dados é realizada.

## 7. Risco Principal e Mitigação
- **Risco:** O operador achar que o botão "Salvar Ajustes" na conciliação teste está persistindo no banco real.
- **Mitigação:** Feedback explícito com badge e toast: `[SANDBOX] Ajustes salvos 100% no Local Storage (Zero DB)`.
