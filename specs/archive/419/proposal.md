# Spec 419 — Proposal: Correção do Parser da Rede e Descarte Falso-Positivo de Relatórios de Vendas

## Problema
Ao importar os arquivos de conciliação da pasta `C:\Users\admin\Desktop\conciliacao\09-26\18-09`, o sistema descartou todos os 6 arquivos de vendas da Rede com a mensagem:
> "Rede Sem Movimento Descartada: Rede_Rel_Vendas_...xlsx (Arquivo sem movimentação financeira (R$ 0,00) ignorado.)"

Mesmo havendo movimentação real significativa em todos os arquivos (totalizando **33 transações** e **R$ 57.679,52** em vendas brutas entre as lojas Dom Pedro, Jabaquara, Rei do Módulo, HD, Jorge Beretta e CAP).

### Causa-Raiz Diagnosticada
1. **Coluna `valor líquido` com hífen (`"-"`):**
   Nos relatórios oficiais de vendas emitidos pela adquirente Rede (`Rede_Rel_Vendas_*.xlsx`), transações recentes de cartões de crédito e débito ainda não liquidadas trazem a coluna `valor líquido` preenchida com a string `"-"` (hífen) e taxas zeradas ou em processamento.
2. **`extractNumber("-")` resulta em `0`:**
   Em `src/lib/parsers/redeParser.ts`, o parser lê `netRaw` (`"-"`), converte via `extractNumber` para `0`, e atribui `netAmount = 0`. Não havia fallback para utilizar `grossAmount - interest` quando o líquido viesse em branco/hífen. Com isso, `totalNet` finalizava como `0.00`.
3. **Guarda de Descarte em `centralImportManager.ts`:**
   Na linha 276 de `src/lib/parsers/centralImportManager.ts`:
   ```typescript
   if (redeRes.transactions.length === 0 || totalNet <= 0) {
     results.alerts.ignoredEmptyRede.push({ ... });
     continue;
   }
   ```
   Como `totalNet` era 0, o manager considerava o arquivo como "sem movimentação financeira" e executava `continue`, ignorando os 6 relatórios e descartando mais de R$ 57 mil em vendas das lojas.

---

## Solução Proposta
1. **Fallback Inteligente de `netAmount` em `redeParser.ts`:**
   Se `rawNetNum === 0` (ou string `"-"`), mas `grossAmount > 0`:
   Calcular `netAmount = roundCurrency(Math.max(0, grossAmount - interest))`. Se não houver taxas registradas na linha (`interest === 0`), `netAmount = grossAmount`.
   Garantir que `totalNet` e `totalGross` reflitam os valores financeiros reais da movimentação.
2. **Correção da Guarda de Arquivo Sem Movimento em `centralImportManager.ts`:**
   Apenas descartar como vazio se `redeRes.transactions.length === 0 || (totalNet <= 0 && totalGross <= 0)`. Se houver transações com valor bruto ou líquido positivo, o arquivo é obrigatoriamente aceito e processado.

---

## Skills Especializadas Aplicadas
- `backend-patterns`: Parsing resiliente, extração determinística de valores monetários e tratamento de edge cases de relatórios financeiros de adquirentes.

---

## Contratos de Dados
- Mantém o contrato `RedeResult` e `RedeTransaction` de `src/lib/parsers/redeParser.ts`:
  - `transactions: RedeTransaction[]` com `grossAmount: number`, `netAmount: number`, `interest: number`.
  - `totalGross: number`, `totalNet: number`, `totalInterest: number`.

---

## Arquivos Afetados
- **Arquivos Existentes Modificados:**
  1. `src/lib/parsers/redeParser.ts` (linhas 185–235: fallback para `netAmount` quando líquido for `"-"`)
  2. `src/lib/parsers/centralImportManager.ts` (linhas 273–285: checagem de `totalNet <= 0 && totalGross <= 0`)
- **Arquivos Novos:**
  - Nenhum.

---

## Plano de Rollback
Caso qualquer problema ocorra, executar rollback atômico via git:
```bash
git checkout -- src/lib/parsers/redeParser.ts src/lib/parsers/centralImportManager.ts
```
Nenhum dado no banco de dados é alterado por esta spec.

---

## Risco Principal e Mitigação
- **Risco:** Arquivo verdadeiramente vazio (com cabeçalhos mas 0 transações) ser importado com erro.
- **Mitigação:** Se `transactions.length === 0`, a condição `redeRes.transactions.length === 0` continua descartando com precisão. Apenas relatórios que contenham transações legítimas com valor serão aceitos.
