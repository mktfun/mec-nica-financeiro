# Design: Corrigir Matemática de "Na Loja OS" (patio-math-fix)

## Arquitetura Técnica
O hook `useDashboardV2.ts` lê `patioOs.data` (`patio_os`) da API. Ele iterará sobre as OSs que possuem o status válido e calculará o montante do Pátio garantindo a fórmula:
```typescript
const saldoAberto = Math.max(0, Number(os.total_value || 0) - Number(os.paid_value || 0));
```
Esse `saldoAberto` será somado no cálculo global e no cálculo por loja. 

## Componentes / Hooks / Funções / Banco
- **`src/hooks/useDashboardV2.ts`**
  - Responsabilidade: Agregar os dados brutos e calcular o caixa.
  - O que muda: Modificação no reduce de `veiculosPatioValor` e `patioByStore[os.store_id].valor`.
- **`supabase/migrations/xxxx_fix_daily_conciliation_patio.sql` (Nova Migration)**
  - Responsabilidade: Atualizar a RPC `calculate_daily_conciliation` para calcular o "Na Loja OS" com a diferença diária (`opened_at::date = p_date OR closed_at::date = p_date`) ao invés do acumulado.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: OS "em_aberto" com Total de 3000 e Pagamento de 3000 (Restante 0).
  - -> Painel deve exibir Pátio = R$ 0,00 (não R$ 3.000,00).
- **Cenário 2**: OS "pago_parcial" com Total de 5000 e Pagamento de 1000.
  - -> Painel deve exibir Pátio = R$ 4.000,00.
- **Cenário 3**: Importação de arquivo de hoje contendo uma OS parcialmente paga (R$ 5.000 restando). A loja tinha R$ 10.000 pendentes globais de dias anteriores.
  - -> Painel "Fechamento por Loja" deve mostrar R$ 5.000,00 e o painel Dashboard Global deve mostrar R$ 15.000,00.
