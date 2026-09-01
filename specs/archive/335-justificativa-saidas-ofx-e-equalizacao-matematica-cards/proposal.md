# Proposal: Justificativa Completa de Saídas OFX e Equalização Matemática do Split nos Cards (335)

## 1. Problema

O usuário identificou dois pontos críticos de operação e consistência contábil:

### Problema 1: Impossibilidade de Justificar Saídas/Débitos Bancários no Extrato
Na tela de extrato da filial (`/conciliacao/$lojaId` -> Aba Extrato), a coluna de **Ações** exibe apenas `—` (travada) para qualquer transação de saída (`type = 'out'`).
Além disso:
- O modal `OrphanCategorizationModal` estava estruturado exclusivamente para receitas de faturamento.
- O operador não consegue justificar um débito bancário avulso (ex: PIX para fornecedor de peças, despesa local ou transferência) nem escolher se esse débito deve **"Somar ao Contas a Pagar / Despesas da Loja"** ou **"Apenas Conciliar (Não Operacional / Já Provisionado)"**.
- Como o débito não pode ser justificado, a `Dif. Saídas` permanece divergente indefinidamente.

### Problema 2: Inconsistência Matemática Aparente no Split de Entradas do Card da Filial
Na filial Planalto (`st-06`), o card exibia:
- `OFX Entradas (Crédito no Banco): R$ 14.167,17`
- `Previsto Vendas (Vendas da Loja): R$ 2.060,05`
- `Dif. Entradas (Divergência Crédito): +R$ 1.812,00`

O operador apontou com total razão:
> *"Como que tá dando quase 2k de diferença se no OFX tem 14k e no previsto tem 2k? A conta $14.167,17 - 2.060,05 = 12.107,12$, não dá $1.812,00$."*

**A Causa Raiz Contábil:**
Dos `R$ 14.167,17` que caíram no banco da Planalto no dia 01/09:
- **R$ 12.355,17** são lotes de liquidação de cartões da Rede de **D-1** (31/08) que caíram na conta hoje.
- **R$ 1.812,00** é um crédito avulso/órfão (PIX Adriana).
- O `Previsto Vendas` de **R$ 2.060,05** refere-se às vendas feitas no balcão hoje (**D-0**).

Ao colocar na mesma linha o *Extrato Bruto Total de D* com as *Vendas de Balcão de D*, os números não subtraem linearmente, gerando confusão cognitiva no operador.

---

## 2. Solução Proposta (Foco em Reuso, Clareza e Governança)

### Solução 1: Fluxo Completo de Justificativa de Saídas Bancárias
1. **No Extrato Bancário (`StoreExtratoBancarioView.tsx`):**
   - Habilitar o botão **"Justificar"** (ou **"Editar"**) para todas as saídas bancárias não conciliadas.
2. **No Modal Polimórfico (`OrphanCategorizationModal.tsx`):**
   - Quando `transactionType === 'out'`:
     * Título: **"Justificar Débito Bancário"** (com tema e ícone Rose).
     * Categorias de Despesa Rápidas: *Peças / Fornecedor Avulso*, *Serviços / Despesa Loja*, *Impostos / Tributos*, *Transferência Entre Lojas*, *Retirada de Sócios / Pró-labore*, *Tarifa Bancária*, *Outros*.
     * Escolha de Destino:
       1. 🧾 **"Somar ao Contas a Pagar / Despesas da Loja"** (`contabilizar_no_subtotal = true`): Cria a despesa em `daily_manual_bills` com `is_extra = true` e vincula ao OFX.
       2. 🚫 **"Apenas Conciliar (Não Operacional / Transferência)"** (`contabilizar_no_subtotal = false`): Marca como justificado no OFX, zerando a divergência sem inflar as contas a pagar da filial.
3. **No Hook (`useCategorizeOrphan.ts`):**
   - Acionar a RPC do Supabase `resolve_orphan_saida_ofx` com os parâmetros tipados.

### Solução 2: Equalização Matemática Linear e Transparente do Split nos Cards
Para que a matemática dos cards seja 100% intuitiva ($A - B = C$ sem discrepâncias):

#### Linha de Entradas (Créditos do Extrato):
- **Coluna 1 (OFX Entradas):** `R$ 14.167,17` (Total de créditos no banco | Sub-label: `Rede D-1: R$ 12.355,17 + Avulsos: R$ 1.812,00`).
- **Coluna 2 (Créditos Conciliados):** `R$ 12.355,17` (Lotes Rede D-1 + PIX OS + Justificados | Sub-label: `Lotes e Vendas Identificadas`).
- **Coluna 3 (Dif. a Justificar):** `+ R$ 1.812,00` (Créditos Órfãos Pendentes | Sub-label: `Créditos a Justificar` ou `100% Conciliado`).
- **Matemática Perfeita:** $14.167,17 - 12.355,17 = \mathbf{+1.812,00}$.

#### Linha de Saídas (Débitos do Extrato):
- **Coluna 1 (Saídas OFX):** `R$ 4.501,00` (Total de débitos no banco).
- **Coluna 2 (Contas Conciliadas):** `R$ 350,00` (Boletos casados + Despesas justificadas).
- **Coluna 3 (Dif. a Justificar):** `- R$ 4.151,00` (Débitos sem conta vinculada).
- **Matemática Perfeita:** $4.501,00 - 350,00 = \mathbf{-4.151,00}$.

Ao justificar o PIX de R$ 4.151,00, a Coluna 2 sobe para `R$ 4.501,00` e a Coluna 3 **zera (`R$ 0,00` - Conciliado)**!

---

## 3. Investigação e Análise de Reuso

- **RPC Existente Reutilizada:** `public.resolve_orphan_saida_ofx` (já presente no banco, testada e atômica).
- **RPC Existente Ajustada:** `public.get_daily_reconciliation_summary` em `supabase/migrations/20260901000012_fix_store_split_linear_subtraction_and_expenses.sql` para garantir que `contas_loja_total` não duplique despesas extras e devolva `entradas_conciliadas_ofx` para batimento linear exato.
- **Componentes Reutilizados e Ajustados:**
  * `OrphanCategorizationModal.tsx` `[MODIFY]`
  * `useCategorizeOrphan.ts` `[MODIFY]`
  * `StoreExtratoBancarioView.tsx` `[MODIFY]`
  * `StoreCardModulo1.tsx` `[MODIFY]`
  * `ConciliacaoLojasView.tsx` `[MODIFY]`

---

## 4. Contratos de Dados & SQL

### RPC `get_daily_reconciliation_summary` (Campos de Filial Atualizados):
```json
{
  "store_id": "st-06",
  "store_name": "Planalto - BRASICAR",
  "saldo_banco": -3845.74,
  "rede_total": 248.05,
  "status_compensacao": "entrou",
  "na_loja_os": 5201.20,
  
  "ofx_entradas_total": 14167.17,
  "entradas_conciliadas": 12355.17,
  "diferenca_entradas": 1812.00,
  
  "ofx_saidas_total": 4501.00,
  "contas_loja_total": 350.00,
  "diferenca_saidas": 4151.00,
  
  "diferenca_total": -2339.00,
  "status": "divergent"
}
```

---

## 5. Risco Principal e Mitigação

- **Risco:** Dupla contagem de despesas se a RPC somar `daily_manual_bills` e `sofx.saidas_justificadas` ao mesmo tempo.
- **Mitigação:** `daily_manual_bills` com `contabilizar_no_subtotal = true` é a SSOT de despesas. A RPC calcula `contas_loja_total` exclusivamente a partir do agrupador de bills `COALESCE(bst.contas_loja_total, 0)`.
