# Design: Nomenclatura e Diferença (097)

## Arquitetura Técnica
A alteração ocorrerá apenas em `src/routes/conciliacao.index.tsx` dentro do map de `stores`.

## Fluxo de UI
1. O usuário vê a loja na lista (ex: Dom Pedro - DP).
2. O grid contendo as 6 métricas será renomeado e reorganizado.
   
**Novo layout dos 6 cards no Fechamento por Loja:**
- **Faturamento Banco** (Variável `saldoItau` - Dinheiro real que caiu no banco)
- **Maquininha** (Planilha)
- **PIX** (Planilha OS)
- **Na Loja OS** (Pátio pendente)
- **Previsto (Soma)** (Soma da Maquininha + PIX)
- **Diferença** (Faturamento Banco - Previsto)

## Lógica Matemática
No `conciliacao.index.tsx`:

```typescript
// 1. Extração de variáveis base
const faturamentoBanco = hasActivityOnDate ? (saldoBancoMod1 || bankInDate || latestBankBalance[store.id] || 0) : 0;
const previstoPlanilhas = maquininha + pixOs;

// 2. Cálculo correto da diferença
const diferenca = faturamentoBanco - previstoPlanilhas;
```

O `isDiferencaOk` deve checar a margem de erro.
Mas atenção à cor no UI:
- Se `diferenca > 0.01` (Sobra): Exibir em Verde (Emerald), denotando sobra de caixa.
- Se `diferenca < -0.01` (Furo): Exibir em Vermelho (Danger), denotando que entrou menos do que devia.
- Se perto de 0: Exibir Neutro.
