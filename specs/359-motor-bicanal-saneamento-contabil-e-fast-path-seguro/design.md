# Design: Motor Bicanal, Saneamento Contábil e Fast-Path Seguro (359)

## Arquitetura e Fluxo de Dados

```
  [Upload OFX / Rede / OSs] ──> CentralImportWizard (Draft Session)
                                            │
                                            ▼
                    RPC: auto_match_daily_transactions
                    - Tier 1: FITID / Doc Unívoco (Auto-Match Direto)
                    - Tier 2: Nome + Valor Exato (Auto-Match Direto)
                    - Tier 3: Vínculo por Loja e Status
                    - Tier 4: Valor Exato SEM LIMIT 1 cego
                              (Se COUNT > 1 ──> Gera SmartResolutionStrip)
                                            │
                                            ▼
                    RPC: get_daily_reconciliation_summary
                                            │
             ┌──────────────────────────────┴──────────────────────────────┐
             ▼                                                             ▼
    [CANAL 1: TESOURARIA REAL]                                    [CANAL 2: BALANÇO WIP & PRODUÇÃO]
  Bancos OFX + Dinheiro Cofre - Limite                            Pátio OS Hoje - Pátio OS Ontem = ΔP4
  Tolerância: R$ 0,00                                             Compensa variação de orçamentos
             │                                                             │
             └──────────────────────────────┬──────────────────────────────┘
                                            ▼
                           GATEKEEPER DO FAST-PATH
               - Todas as 10 lojas aprovadas (sem erro compensado)
               - Zero transações bancárias órfãs pendentes
               - Zero colisões de valor sem desambiguação
               - Zero ajustes ad-hoc não declarados
                                            │
                   ┌────────────────────────┴────────────────────────┐
                   ▼                                                 ▼
        [SIM: 85% dos Dias]                               [NÃO: 15% dos Dias]
        Botão 1-Clique Visível                            Smart Resolution Strip &
        ⚡ Fechar em < 30 seg                              Exceções Pontuais da Loja
```

---

## Interfaces TypeScript

### 1. Extensão de `DailyReconciliationSummary` (`src/hooks/useBackendConciliacao.ts`)
```typescript
export interface DualChannelSummary {
  // Canal 1: Tesouraria Líquida Real
  caixa_tesouraria: number;
  liquidez_disponivel_boletos: number;
  status_tesouraria: 'equilibrado' | 'atencao' | 'descoberto';

  // Canal 2: Produção WIP & Equilíbrio Temporal
  patio_wip: number;
  variacao_patio_delta_p4: number;
  neutralizacao_temporal_aplicada: number;

  // Indicador de Fast-Path
  fast_path_eligible: boolean;
  fast_path_reasons?: string[];
}
```

### 2. Interface de Colisão de Auto-Match (`src/components/importacoes/wizard/SmartResolutionStrip.tsx`)
```typescript
export interface ValueCollisionItem {
  id: string;
  amount: number;
  store_id: string;
  store_name: string;
  counterpart_name?: string;
  occurred_at: string;
  candidate_os: Array<{
    id: string;
    os_number: string;
    client_name?: string;
    plate?: string;
    total_value: number;
    paid_value: number;
    opened_at: string;
  }>;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/lib/modulo1Calculations.ts`
- **Linhas 60, 144 e 178:** Remover `Math.abs(valor_disp_contas)` e `Math.abs(g29)`.
- Substituir por:
  ```typescript
  // Antes:
  const diferenca = Math.abs(valor_disp_contas) - valor_contas;
  // Agora (Algébrico Canônico):
  const diferenca = valor_disp_contas - valor_contas;
  ```

### 2. `supabase/migrations/20260903000025_dual_channel_reconciliation_engine.sql` [NEW MIGRATION]
- Atualização da RPC `get_daily_reconciliation_summary`:
  - Retornar `caixa_tesouraria = v_total_saldo_banco_positivo + v_dinheiro_mp - v_saldo_negativo_itau`.
  - Calcular $\Delta P_4 = v\_na\_loja\_os - v\_na\_loja\_os\_anterior$.
  - Calcular `fast_path_eligible` avaliando se todas as filiais possuem `status = 'approved'` e se não há entradas órfãs descontroladas.
- Atualização da RPC `auto_match_daily_transactions`:
  - Na Fase 2 (vínculo PIX/OS), verificar unicidade antes do UPDATE. Se houver mais de uma OS aberta com aquele valor exato na mesma loja, pular a baixa cega e retornar a lista em `collisions`.

### 3. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`
- Adicionar o card do Gatekeeper de 1-Clique:
  ```tsx
  {isFastPathReady && (
    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Zap className="text-emerald-400 animate-pulse" size={24} />
        <div>
          <h4 className="text-sm font-bold text-emerald-400">Fast-Path Ativo — Todas as 10 Filiais Auditadas e Alinhadas</h4>
          <p className="text-xs text-zinc-400">Zero divergências, zero órfãos e zero colisões de valor.</p>
        </div>
      </div>
      <Button onClick={onFinish} className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-6 py-2.5 rounded-xl flex items-center gap-2">
        <Zap size={16} /> Fechar Dia em 1-Clique
      </Button>
    </div>
  )}
  ```

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Erradicação do Bug `Math.abs` em Déficit de Caixa
- **Estado Inicial:** `valor_disp_contas = -50000`, `valor_contas = 50000`.
- **SCAN:** O código antigo fazia `|-50000| - 50000 = 0`, reportando aprovação indevida.
- **INFER:** A subtração direta deve computar `-50000 - 50000 = -100000`.
- **VERIFY:** Executar teste de unidade com `calculateGlobalConciliacao` e garantir que o resultado é `-100000` com status de alerta em vermelho.
- **FIX:** Validar que `modulo1Calculations.ts` não possui mais nenhuma ocorrência de `Math.abs` em diferenças contábeis.

### Cenário 2: Prevenção de Quitação Cega de Mesma Quantia (Same-Amount Hazard)
- **Estado Inicial:** Loja possui duas OSs em aberto de R$ 250,00 (`#101` e `#102`). Um PIX de R$ 250,00 entra no extrato sem número de OS e sem nome de cliente compatível.
- **SCAN:** O motor antigo executava `ORDER BY opened_at DESC LIMIT 1` e dava baixa na OS `#102` arbitrariamente.
- **INFER:** Com o novo motor, a RPC detecta colisão (`count > 1`) e não baixa nenhuma OS automaticamente.
- **VERIFY:** O PIX permanece pendente e é enviado para a `SmartResolutionStrip` ou drawer de exceção para que o operador decida.
- **FIX:** Verificar no banco que nenhuma OS teve `status = 'finalizada'` indevidamente.
