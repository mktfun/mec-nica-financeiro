# Design: Preservação Total de Transações OFX e Herança de Conciliações Anteriores/Posteriores (291)

## Arquitetura de Herança de Conciliações

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    IMPORTAÇÃO DE LOTE OFX (Qualquer Dia / Pós-Feriado)                  │
└────────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [ Transação da Data Atual ]                 [ Transação de Outra Data ]
             (occurred_at === target_date)               (Fim de semana / Feriado / Retroativo)
                       │                                           │
                       ▼                                           ▼
             [ Fluxo Normal de Match ]                   [ Busca Histórico no DB ]
             - PIX OS Match                              - Consulta por fitid / store_id
             - Auto-Match Despesas                       - Busca em justified_transactions
                       │                                           │
                       │                             ┌─────────────┴─────────────┐
                       │                             ▼                           ▼
                       │                    [ Já Conciliada ]           [ Sem Conciliação ]
                       │                    Herda Justificativa         Permite conciliar
                       │                    e Ativa LOCK 🔒             normalmente
                       │                             │                           │
                       └─────────────────────────────┼───────────────────────────┘
                                                     ▼
                               [ Extrato Bancário da Filial ]
                               - Exibe 100% das transações
                               - Badges coloridos normais para a data atual
                               - Badge 🔒 "Conciliado em DD/MM/AAAA" para outras datas
                               - Ações de edição desabilitadas para itens travados
```

## Interfaces TypeScript

```typescript
export interface EnrichedTransaction {
  id: string;
  store_id: string;
  amount: number;
  type: 'in' | 'out';
  occurred_at: string;
  target_date: string;
  title: string;
  counterpart_name?: string;
  os_number?: string;
  manual_category?: string;
  manual_justification?: string;
  isLockedFromOtherDate: boolean;
  lockedReconciliationDate?: string;
}
```

## Padrões Visuais Nativos

1. **Badge de Trava de Outra Data:**
   - `<Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700 font-mono text-[10px]">`
   - Ícone `<Lock size={11} className="mr-1 text-zinc-400" />`
   - Texto: `Conciliado em 22/08` ou `OS #588 (22/08)`
2. **Coluna de Ações:**
   - Quando `isLockedFromOtherDate === true`: exibe `<span className="text-[10px] text-zinc-500 font-mono">Somente Leitura</span>`.

## Cenários de Teste

- **Cenário 1 (Pós-Feriado / Segunda-Feira):**
  - No OFX de 26/08 vem transação de 22/08 (sexta) já conciliada na sexta-feira.
  - *Resultado Esperado:* Aparece no extrato com badge `🔒 Conciliado em 22/08` e trava de edição ativa.
- **Cenário 2 (Transação da data atual):**
  - Transação de 26/08 no OFX de 26/08.
  - *Resultado Esperado:* Aberta para conciliação normal com botões ativos.
