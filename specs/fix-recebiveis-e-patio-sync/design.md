# 📐 SDD Design: Sincronização de Pátio, Recebíveis e Parcelamento de Boletos

## 1. Arquitetura de Fluxo

```
[Planilha OS ConferenciaOSxFinanceiro]
        │
        ▼
[useOsImportProcessor.ts]
  - Extrai Formas: Sinal/PIX vs Boleto
  - Detecta Parcelas: 1/N, 2/N ... N/N
  - Calcula Vencimento Útil (calculateDueDate)
  - Arredonda Centavos na última parcela
        │
        ▼
[savePatioOsAndReceivables] (useImportProcessor.ts)
  - Idempotência por (store_id, os_number, installment, type)
  - Insere em receivables (status: 'pendente', paid_value: 0)
        │
        ▼
[Supabase: tabela receivables]
        ▲
        │ Consulta reativa
[src/routes/recebiveis.tsx]
  - targetDate inicializado via getDefaultDate()
  - Tabs: 'todas' | 'em_aberto' | 'vencidos' | 'liquidados'
  - Botão Auto-Match OFX (RPC auto_match_receivables)
  - Baixa Manual com modal
```

---

## 2. Design System & UI Standards

- Padrão **Zinc-950** canônico (`bg-background`, `bg-card`, `border-border/40`).
- Badges com variantes semânticas:
  - `pendente`: Amber (`bg-amber-500/10 text-amber-400 border-amber-500/20`)
  - `recebido`: Emerald (`bg-emerald-500/10 text-emerald-400 border-emerald-500/20`)
  - `vencido`: Rose (`bg-rose-500/10 text-rose-400 border-rose-500/20`)
- Animações e transições $\le 200$ms (`transition-colors`, `fade-in`).

---

## 3. Interfaces TypeScript Reais

```typescript
export interface ParsedReceivable {
  store_name: string;
  os_number?: string;
  installment?: string;
  description: string;
  type: 'Boleto' | 'Transferência' | 'Cheque' | 'Cartão' | 'Outros';
  value: number;
  date: string;
  due_date: string;
  status: 'pendente' | 'recebido';
}

export interface ReceivableItem {
  id: string;
  store_id: string;
  store_name: string;
  description: string;
  os_number?: string | null;
  installment?: string | null;
  type: 'Boleto' | 'Transferência' | 'Cheque' | 'Cartão' | 'Outros';
  value: number;
  paid_value?: number | null;
  discount_value?: number | null;
  interest_value?: number | null;
  status: 'pendente' | 'recebido' | 'vencido' | 'cancelado';
  date: string;
  due_date: string;
  received_at?: string | null;
  matched_ofx_id?: string | null;
  created_at: string;
  temporal_status?: 'a_vencer' | 'vence_hoje' | 'vencido' | 'recebido' | 'cancelado';
}
```

---

## 4. Cenários Obrigatórios

### Happy Path:
1. Usuário acessa `/recebiveis`.
2. A página carrega com `targetDate` definido para a data corrente de trabalho (`getDefaultDate()`, ex: 17/09/2026).
3. Os títulos e boletos de setembro aparecem listados com seus respectivos valores, filiais e status temporal corretos.
4. Ao clicar em "Auto-Match OFX", créditos bancários conciliam automaticamente títulos pendentes com tolerância de tarifa de até R$ 5,00.

### Edge Case:
- **OS com Sinal + Boleto Parcelado:** OS de R$ 3.000 com `PIX: 1000.00; Boleto 2x: 2000.00`.
  - O sistema registra o PIX de R$ 1.000 como entrada do dia na OS.
  - Gera Parcela 1/2 de R$ 1.000,00 para D+30 e Parcela 2/2 de R$ 1.000,00 para D+60 em `receivables`.
  - A soma das parcelas é exatamente R$ 2.000,00. Zero diferença nos Recebíveis e zero duplicação com o PIX.

---

## 5. Critérios de Aceitação Verificáveis

1. `npm run build` compila com 0 erros de TypeScript.
2. A tela `/recebiveis` inicia com a data de conciliação atual (`getDefaultDate()`) e renderiza os lançamentos sem ficar em branco.
3. Não há alteração destrutiva no cálculo do Pátio (R$ 74.433,57 preservado como SSOT).
