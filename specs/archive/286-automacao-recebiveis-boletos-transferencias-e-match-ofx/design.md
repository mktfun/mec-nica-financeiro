# Design: Automação de Recebíveis para Boletos e Transferências Bancárias (286)

## Arquitetura Técnica
```text
ConferenciaOSxFinanceiro.xls (Upload)
      │
      ▼
useOsImportProcessor.ts ──► bankingCalendar.ts (Feriados Nacionais + Dias Úteis)
      │
      ▼
receivablesArray: ParsedReceivable[] (Boleto 1/2, Boleto 2/2, Transferência D+1)
      │
      ▼
savePatioOsAndReceivables() (PostgreSQL)
      │
      ├──► public.patio_os (OS registrada com vínculo a prazo)
      │
      └──► public.receivables (Títulos pendentes com due_date útil)
                  │
                  ▼
OFX Transactions (Extrato Bancário Itaú)
      │
      ▼
RPC auto_match_receivables (PostgreSQL)
      │
      ├─── Match Alta Certeza ──► status = 'recebido', matched_ofx_id
      │
      └─── Match Sugerido ──────► UI Badge "Confirmar Baixa (1-Click)" na tela de Recebíveis
```

## Utilitário de Calendário Bancário (`src/lib/bankingCalendar.ts`)
```typescript
export function isWeekend(date: Date): boolean;
export function isNationalHoliday(date: Date): boolean;
export function getNextBusinessDay(date: Date): Date;
export function addBusinessDays(startDate: Date, businessDays: number): Date;
export function calculateDueDate(baseDate: Date, paymentType: 'Boleto' | 'Transferência', installmentIndex: number, totalInstallments: number): string;
```

## Interfaces TypeScript (`src/hooks/useImportProcessor.ts` e `useRecebiveis.ts`)
```typescript
export interface ParsedReceivable {
  store_id?: string;
  store_name?: string;
  os_number: string;
  installment: string; // "1/2", "2/2", "1/1"
  description: string;
  type: 'Boleto' | 'Transferência' | 'Cheque' | 'Cartão' | 'Outros';
  value: number;
  date: string;       // YYYY-MM-DD (emissão)
  due_date: string;   // YYYY-MM-DD (vencimento em dia útil)
  status: 'pendente' | 'recebido' | 'vencido' | 'cancelado';
}
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Boleto 2x em Sexta-Feira):**
  - OS #5001 no valor de R$ 2.000 com "BOLETO 2X" emitida em 2026-08-21 (Sexta).
  - Parcela 1 (R$ 1.000): Vencimento em D+30 (2026-09-20 - Domingo) -> Ajustado para 2026-09-21 (Segunda).
  - Parcela 2 (R$ 1.000): Vencimento em D+60 (2026-10-20 - Terça).
  - Resultado: 2 títulos criados em `receivables` e OS não duplica no `na_loja_os`.
- **Cenário 2 (Transferência Bancária em Sexta-Feira):**
  - OS #5002 no valor de R$ 1.500 com "TRANSF BANCARIA" emitida em 2026-08-21 (Sexta).
  - Vencimento calculado: D+1 útil -> 2026-08-24 (Segunda-feira).
  - Ao importar o extrato OFX do dia 24/08 contendo crédito TED de R$ 1.500, a RPC dá baixa automática no recebível.
