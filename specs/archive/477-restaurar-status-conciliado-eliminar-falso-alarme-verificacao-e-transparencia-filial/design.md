# 📐 Design — Spec 477: Restauração do Status Canônico (Conciliado/Divergência), Eliminação de Falso Alarme de Verificação e Transparência por Filial

## 1. Arquitetura de Apresentação e Fluxo de Dados
```
[PostgreSQL RPC: get_daily_reconciliation_summary]
        │
        ▼ (Stores, Saldos, verificacao_vinculos)
[useDailyReconciliationSummary(selectedDate)]
        │
        ├──▶ [StoreCardModulo1.tsx (Card de Filial)]
        │      ├── Badge Verde: "CONCILIADO" (se isDiferencaOk)
        │      ├── Badge Âmbar: "A COMPENSAR" (se hasACompensar)
        │      ├── Badge Vermelho: "DIVERGÊNCIA R$ X,XX" (se !isDiferencaOk)
        │      └── Badge de Vínculo: Omitido se 0 pendências / Âmbar se pendingCount > 0
        │
        └──▶ [conciliacao.$lojaId.tsx (Detalhes da Filial)]
               ├── Top Banner: Feedback Executivo imediato (100% Conciliada vs Pendente)
               └── Abas: Indicadores de conformidade (✓) ou alertas unitários pulsantes
```

---

## 2. Design System & UI Standards (Zinc-950)
- **Status Conciliado:**
  - `<Badge variant="success" size="sm">CONCILIADO</Badge>`
  - Tokens: `bg-emerald-950/50 text-emerald-400 border border-emerald-500/30`.
- **Status Divergência:**
  - `<Badge variant="danger" size="sm">DIVERGÊNCIA ({formatCurrency(data.diferenca)})</Badge>`
  - Tokens: `bg-rose-950/50 text-rose-400 border border-rose-500/30`.
- **Status A Compensar:**
  - `<Badge variant="warning" size="sm">A COMPENSAR</Badge>`
  - Tokens: `bg-amber-950/50 text-amber-400 border border-amber-500/30`.
- **Status Sem Movimento:**
  - `<Badge variant="neutral" size="sm">SEM MOVIMENTO</Badge>`
  - Tokens: `bg-zinc-800/80 text-zinc-300 border border-zinc-700/60`.

---

## 3. Interfaces TypeScript Reais
Consumo estrito de `StoreCardData` e `VerificacaoVinculosData` em `src/hooks/useBackendConciliacao.ts`:
```typescript
export interface VerificacaoVinculosGroup {
  total: number;
  covered: number;
  pending: number;
  status: 'verified' | 'pending';
}

export interface VerificacaoVinculosData {
  total_checks: number;
  pending_count: number;
  status: 'verified' | 'pending' | 'incomplete';
  groups: {
    os_payments: VerificacaoVinculosGroup;
    rede_os: VerificacaoVinculosGroup;
    entradas_ofx: VerificacaoVinculosGroup;
    saidas_ofx: VerificacaoVinculosGroup;
  };
}
```

---

## 4. Cenários Obrigatórios

### Happy Path (Cenário Dom Pedro 26/08):
- **Entradas:** R$ 7.615,74 (Dif R$ 0,00)
- **Saídas:** R$ 1.370,00 (Dif R$ 0,00)
- **Cartão:** 1 venda de R$ 6.479,00 casada com a OS #587
- **Resultado na UI:**
  - Card da loja exibe os badges: `[CONCILIADO]` em verde e `[A COMPENSAR]` em âmbar.
  - Zero menção a "Verificação Incompleta" em vermelho.
  - Ao entrar em `/conciliacao/st-01`, o topo confirma: *"Filial 100% Conciliada — Saldo de Entradas e Saídas fechados sem divergência."*

### Edge Case (Filial com Divergência Real ou Falta de OS):
- Loja com venda de cartão não vinculada:
  - Card exibe `[DIVERGÊNCIA R$ 150,00]` em vermelho + badge informativo `[1 Venda s/ OS]` em âmbar.
  - Ao entrar na loja, a aba `1. Cartão / Maquininha` exibe o badge pulsante vermelho `1`, e o topo avisa claramente: *"Pendente: 1 transação de cartão sem Ordem de Serviço vinculada."*

---

## 5. Critérios de Aceitação Verificáveis
1. Dom Pedro (`st-01`) não exibe em hipótese alguma o badge vermelho "VERIFICAÇÃO INCOMPLETA".
2. Dom Pedro exibe o badge verde **`CONCILIADO`** e o badge âmbar **`A COMPENSAR`**.
3. Na tela interna da filial, o usuário vê um feedback claro de que a loja está regularizada.
4. O console do navegador não dispara o erro HTTP 400 em `bot_downloaded_files` ao navegar em `/importacoes`.
5. `npm run build` passa limpo (código 0).
