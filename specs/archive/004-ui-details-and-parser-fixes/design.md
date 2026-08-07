# Design: UI Details & Parser Fixes (004)

## UI (Componentes)
- **`OsDetailsModal.tsx`**: Novo componente na pasta `src/components/patio/` ou apenas embutido em `src/routes/patio.tsx`. Receberá o objeto `os` do tipo `PatioRow`. Exibirá uma UI limpa com os dados completos (Data de entrada, dias em aberto, total, pago, e uma lista com as formas de pagamento decodificadas).

## Lógica do Banco de Dados / Processamento
- No arquivo `ImportReportDialog.tsx`, antes de somar `totalOs` e `totalPaid` para enviar ao fechamento diário, precisamos verificar se a OS pertence ao dia alvo da importação (`targetDate` ou `hoje`).
```typescript
const isToday = closed_at === targetDate; // (ou getDefaultDate se targetDate não existir explicitamente no escopo da tela)
if (statusStr === "Finalizada" && isToday) { 
  totalOs += osValue;
  totalPaid += paidValue;
}
```
Isso resolverá o salto absurdo de R$ 89 mil (que na verdade foi o somatório do faturamento inteiro da história contida na planilha).

## Mapa de Dependências
- `src/routes/patio.tsx` -> Depende de gerenciar o estado `selectedOs` para abrir o modal.
- `src/components/dashboard/ImportReportDialog.tsx` -> Modificado para filtrar por data antes de somar as globais.
