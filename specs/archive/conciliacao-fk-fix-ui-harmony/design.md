# Design: CorreçÁo de Foreign Key no Importador e HarmonizaçÁo Visual da ConciliaçÁo (conciliacao-fk-fix-ui-harmony)

## Arquitetura do Layout e CorreçÁo de FK

```
 ┌────────────────────────────────────────────────────────┐
 │ 1. SANITIZAÇÁO DE FK EM MATCHES (CentralImportWizard)  │
 │    - Se txId nÁo for UUID válido em transactions →     │
 │      set ofx_transaction_id = null                    │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. HERO CARD RECONSTRUÍDO (ResumoDiaPanel.tsx)        │
 │    - Layout limpo, escuro (#0B0D17 / #121526)          │
 │    - Métricas Módulo 1 (G13 a G31) integradas          │
 │    - Seletor de data e navegaçÁo preservados           │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. FECHAMENTO POR LOJA (conciliacao.index.tsx)         │
 │    - Régua de 6 colunas por unidade:                   │
 │      [Banco Itaú] [Dinheiro MP] [A Receber]            │
 │      [Na Loja OS] [Saldo Total] [Resultado Final G31] │
 └────────────────────────────────────────────────────────┘
```

## SanitizaçÁo de FK em `useConciliacao.ts` e `CentralImportWizard.tsx`

```typescript
const isValidUuid = (id?: string | null) => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// Em useResolveUnmatchedAlert:
const safeOfxId = isValidUuid(txId) ? txId : null;
```

## Componente Reformulado `ResumoDiaPanel.tsx`

Substitui o antigo card genérico pelo **Hero Card Consolidado do Módulo 1 (Aba SALDO G13 a G31)**:
- Cabeçalho elegante com data, seletor de calendário e badges de aprovaçÁo.
- Grid de 4 pilares: Banco Itaú (G13), Dinheiro MP (G14 Manual), A Receber (G15), Na Loja OS (G16).
- Faixa de fechamento: Saldo Total (G17), Caixa Atual (G21), Disponível Contas (G29) e Resultado Final (G31).

## Lista de Lojas em `src/routes/conciliacao.index.tsx`

Cada card de loja exibirá os 6 valores do Módulo 1 daquela unidade:
```typescript
<Card key={store.id} className="p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-elevated)] transition-colors">
  <div className="flex items-center justify-between">
    <span className="font-bold text-base text-white">{store.name}</span>
    <Badge variant={calc.resultado_final_g31 >= 0 ? "success" : "danger"}>
      Result: R$ {calc.resultado_final_g31.toLocaleString('pt-BR')}
    </Badge>
  </div>
  <div className="grid grid-cols-6 gap-2 mt-3 font-mono text-xs text-right">
    <div>Banco: R$ {calc.saldo_g13}</div>
    <div>Dinheiro MP: R$ {calc.dinheiro_mp_g14}</div>
    <div>A Receber: R$ {calc.a_receber_g15}</div>
    <div>Na Loja: R$ {calc.na_loja_g16}</div>
    <div>Saldo Total: R$ {calc.saldo_total_g17}</div>
    <div>Resultado: R$ {calc.resultado_final_g31}</div>
  </div>
</Card>
```

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (ImportaçÁo Sem Erro de FK):**
  - *Dados:* Upload de arquivos OFX + OS + Rede no `CentralImportWizard`.
  - *AçÁo:* Clicar em "Confirmar ImportaçÁo".
  - *Resultado Esperado:* O wizard salva todas as transações e matches sanitizados com `ofx_transaction_id` válido sem estourar o erro de Foreign Key.

- **Cenário 2 (Hero Card e Régua das Lojas na ConciliaçÁo `/conciliacao`):**
  - *Dados:* Visualizar a tela principal de conciliaçÁo.
  - *AçÁo:* Navegar pelas datas.
  - *Resultado Esperado:* O Hero Card exibe o resumo unificado do Módulo 1 e a lista "Fechamento por Loja" exibe exatamente os 6 pilares (`Banco Itaú`, `Dinheiro MP`, `A Receber`, `Na Loja OS`, `Saldo Total`, `Resultado Final`).
