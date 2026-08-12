# Design: Marco Zero Global Completo (169-marco-zero-globals)

## Arquitetura Técnica
`Excel Conciliação` → `marcoZeroParser.ts` (Extrai todos os 15+ campos globais usando fuzzy label match e row-scanning) → `MarcoZeroWizard.tsx` (Exibe os campos detalhados na UI e converte em Payload) → `Supabase Insert` (Insere colunas hardcoded + colunas flexíveis no `metadata` JSONB da `daily_snapshots`).

## Interfaces TypeScript

```typescript
export interface MarcoZeroGlobalData {
  // Principais (Hardcoded no DB)
  dinheiroMp: number;
  aReceber: number;
  negativo: number;
  caixaAnterior: number;
  caixaAtual: number;
  faturamentoAtual: number;
  
  // Metadata (JSONB)
  fluxoCaixa: number;
  faturamentoAnterior: number;
  valorDisponivelContas: number;
  valorDasContas: number;
  diferenca: number;
  jurosAtual: number;
  contas: number;
  prolaboreDaniel: number;
  prolaboreHenrique: number;
}
```

## Componentes / Hooks / Funções
1. **`supabase/migrations/<timestamp>_add_metadata_daily_snapshots.sql`**: Migration adicionando `ALTER TABLE daily_snapshots ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;`
2. **`src/lib/parsers/marcoZeroParser.ts`**: Lógica de parser resiliente. Varre cada row procurando chaves (keys de colunas do excel como `__EMPTY_6`, `__EMPTY_7` etc). Se achar uma string compatível com o label, usa a função `cleanNumber` em todas as outras chaves numéricas daquela mesma linha e pega o primeiro valor numérico válido (isso contorna mudanças de índice de coluna). E resolve caracteres mal codificados.
3. **`src/components/importacoes/MarcoZeroWizard.tsx`**: Update da UI do wizard para mapear o objeto novo estendido. Exibir "Métricas Globais da Rede" com duas colunas no card (Grid 2 cols) para não ficar enorme e mostrar tudo que o usuário pediu, validando visualmente antes de comitar no banco.
4. **`src/lib/supabase.ts` (ou chamadas do Supabase no Frontend)**: Update da query no botão "Implantar" para incluir o objeto `metadata`.

## Fluxo de UI
1. O usuário faz upload do `.xlsx`.
2. A tela exibe a "Data da Implantação".
3. A tela exibe o "Métricas Globais da Rede" agora contendo 15 campos detalhados sobre o lastro financeiro do dia (Saldos, Fluxo de Caixa, Faturamento, Despesas e Diferença).
4. As Lojas e OSs pendentes continuam em formato de lista minimalista logo abaixo, aguardando o Vínculo.
5. Ao confirmar, injetamos tudo no `daily_snapshots` do Supabase.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Upload do Excel 1008.xlsx → Parser extrai TODOS os 15 campos corretamente, ignorando colunas vazias intermediárias → Valores aparecem na UI.
- **Cenário 2:** Insert no DB → O JSON `metadata` é preenchido e não rejeitado.
- **Cenário 3:** Strings quebradas como "SALDO BANCO ITAÁš" → O parser identifica corretamente como "SALDO BANCO ITAÚ / NEGATIVO" através de substring parcial (ex: `ITA` ou `NEGATIVO`).
