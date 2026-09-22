# Spec 422 — Design: Paridade Contábil Total e Drilldown Interativo no Sandbox de Conciliação (Zero DB)

## 1. Arquitetura de Fluxo de Dados

```
[Supabase daily_snapshots (D-1)] ───(SELECT Read-Only)───┐
                                                         ▼
[Arquivos Reais Uploaded] ──► [parseCentralImports] ──► [sandboxCalculator]
                                                         │
                                                         ▼
                                             [DailyReconciliationSummary]
                                             • Caixa Ant: Real D-1
                                             • A Receber: D-1 + Novos
                                             • Fluxo Caixa: Balanceado
                                             • Dif Final: ~0,00
                                                         │
                                                         ▼
                                                [localStorage]
                                                         │
                        ┌────────────────────────────────┴────────────────────────────────┐
                        ▼                                                                 ▼
          [ResumoDiaPanel + LojasView]                                      [SandboxDrilldownModals]
        (Cards com Valores Equalizados)                                      • Cofre Daniel
                                                                             • Pátio OS Restante
                                                                             • Títulos a Receber
                                                                             • Faturamento & Contas
```

---

## 2. Design System & UI Standards
- **Paleta de Superfícies:** `bg-background` (Zinc-950), `bg-card` (Zinc-900), `border-border`.
- **Tokens de Interação nos Modais:** Modais em `bg-zinc-900 border border-zinc-800` com backdrop escuro `bg-black/80 backdrop-blur-sm`.
- **Feedback de Status:** Cores canônicas de badges:
  - Verde: `text-emerald-400 bg-emerald-500/10 border-emerald-500/30`
  - Âmbar: `text-amber-400 bg-amber-500/10 border-amber-500/30`
  - Ciano (Sandbox): `text-cyan-400 bg-cyan-500/10 border-cyan-500/30`

---

## 3. Interfaces TypeScript Reais

```typescript
export interface BaselineD1Data {
  date: string;
  caixa_atual: number;
  faturamento: number;
  total_patio: number;
  a_receber_manual: number;
  dinheiro_mp: number;
  contas_a_pagar: number;
  odometro_hoje?: number;
}

export interface SandboxCalculatorInputV2 {
  results: CentralImportResults;
  matchingResult: AutoMatchingResult;
  mapping: Record<string, string>;
  stores: StoreRow[];
  targetDate: string;
  baselineD1?: BaselineD1Data | null;
  manualOverrides?: {
    faturamentoDia?: number;
    odometroHoje?: number;
    dinheiroMp?: number;
    aReceber?: number;
    contasManual?: number;
  };
}

export interface SandboxDrilldownModalsProps {
  session: SandboxReconciliationSession;
  activeModal: 'cofre' | 'patio' | 'recebiveis' | 'faturamento' | 'contas' | 'saldos' | null;
  onClose: () => void;
  onUpdateSession?: (updated: SandboxReconciliationSession) => void;
}
```

---

## 4. Cenários Obrigatórios

### Happy Path
1. O operador carrega arquivos na Aba 1 do Sandbox Hub (`/teste/import`).
2. O sistema executa a leitura dos arquivos e consulta o snapshot anterior D-1 (ex: 17/09 onde `caixa_atual = R$ 257.321,43` e `a_receber = R$ 6.929,67`).
3. Ao concluir a simulação e alternar para a Aba 2 (Painel de Conciliação):
   - **Caixa Anterior:** Exibe os **R$ 257.321,43** reais de ontem.
   - **A Receber:** Exibe os **R$ 6.929,67** acumulados + títulos novos.
   - **Fluxo de Caixa & Diferença Final:** Apresenta o fechamento contábil equalizado (próximo de zero).
4. O operador clica no botão **Cofre ↗**: Abre o `SandboxDrilldownModals` mostrando a OS #620 de R$ 500,00 de Dom Pedro em trânsito.
5. O operador clica no botão **Ver OSs ↗**: Abre o detalhe das OSs no pátio com o comparativo do saldo do dia anterior.
6. O operador clica no botão **Ver Títulos ↗**: Abre a lista de boletos e transferências da simulação.
7. O operador ajusta o odômetro ou contas e clica em **"Salvar Ajustes no Sandbox"**: O snapshot simulado no `localStorage` é recalculado instantaneamente.

### Edge Case
1. **Primeira data do sistema (Sem snapshot D-1 no banco):**
   - O sistema aplica fallback suave para R$ 0,00 informando no painel que se trata de carga inicial de marco zero.
2. **Operador clica em múltiplos modais simultâneos:**
   - O estado `activeModal` garante que apenas um modal seja renderizado por vez com foco e trap de teclado acessível.

---

## 5. Critérios de Aceitação Verificáveis
1. **Fim do Caixa Anterior Zerado:** `Caixa Anterior` na tela de conciliação simulada NUNCA deve ser R$ 0,00 quando existir um fechamento prévio em `daily_snapshots`.
2. **Fim do A Receber Zerado:** `A Receber` na tela de conciliação simulada deve refletir o saldo acumulado de D-1 mais os títulos das OSs importadas.
3. **Drilldowns Ativos:** Todos os botões dos cards (`Cofre ↗`, `Ver OSs ↗`, `Ver Títulos ↗`, `Ver Detalhes ↗`, `Ver Contas ↗`) devem abrir seus respectivos modais com os dados da sessão local.
4. **Zero Mutações no Banco:** Nenhuma chamada de escrita é disparada para o Supabase.
5. **Terminal Gate:** `npm run build` deve compilar com exit code 0.

---

## 6. Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]
- **Teste 1: Herança do Snapshot D-1:**
  - Carregar arquivos de 18/09 -> Verificar que `caixa_anterior` é exatamente o valor de 17/09 do banco (`257.321,43`).
- **Teste 2: Interatividade dos Modais:**
  - Clicar em `Cofre ↗` na Aba 2 -> Verificar que o modal exibe a lista de OSs em dinheiro da sessão simulada.
