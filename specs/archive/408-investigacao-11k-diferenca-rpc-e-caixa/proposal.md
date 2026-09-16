# Spec 408: Investigação Forense da RPC e Resolução da Divergência de Saldos Bancários e Dinheiro no Cofre

## 1. Contexto & Problema Reportado
O usuário ajustou o Dinheiro MP para o valor físico real (R$ 19.526,00), o que derrubou a divergência inicial de -R$ 11.756,73 para -R$ 2.966,73.
Em seguida, o usuário refez os lançamentos de dinheiro no cofre das filiais, deixando 3 valores pendentes sem "Dar Baixa" (por ainda não terem sido creditados no banco):
- **Planalto (st-06):** R$ 1.750,00
- **Rudge Ramos (st-07):** R$ 168,50
- **Santo André (st-08):** R$ 2.000,00
- **Total Pendente no Cofre:** **R$ 3.918,50**

O usuário constatou:
> *"mas agr que eu n deibaixa em uns 3 o saldo ta o mesmo saca? ent tem um erro aq na rpc, vc ta fazendo alguma coisa errada n sei caa, mas deveria contar tbm, certo?"*

Evidências nas imagens anexadas pelo usuário:
1. No Card 1 (`SALDO BANCOS + DINHEIRO`), o valor exibido é **R$ 158.907,77** (apenas OFX 129.709,49 + Rede 29.198,28). O chip exibe `DINHEIRO NO COFRE (C) R$ 3.918,50`, mas o valor **NÃO foi somado** no saldo do card!
2. No modal Raio-X (`SaldoBancosDetailModal`), o total exibido no card verde superior é **R$ 162.826,27** (Bancos + Cofre + Cartões: 129.709,49 + 3.918,50 + 29.198,28). Há uma divergência direta de R$ 3.918,50 entre a tela e o modal!
3. Ao alternar entre dar baixa ou não, o Saldo do Card 1 não se moveu.

---

## 2. Diagnóstico Forense: As Duas Causas-Raiz Confirmadas

### Causa-Raiz 1: Supressão Incorreta no Frontend (`ResumoDiaPanel.tsx` e `useBackendConciliacao.ts`)
Em `ResumoDiaPanel.tsx` (linhas 242-247):
```tsx
// Se o fechamento já possui Dinheiro MP preenchido manualmente (Card 2),
// NÃO somamos o cofre cumulativamente no Card 1 para evitar contagem dupla de dinheiro no Caixa Atual!
const hasDinheiroManual = Number(dinheiroMpValor || 0) > 0;
const cashToConsolidate = hasDinheiroManual ? 0 : effectiveDinheiro;
const totalPositivoConsolidado = Number((effectiveOfxPos + cashToConsolidate + effectiveMaq).toFixed(2));
```
E em `useBackendConciliacao.ts` (linhas 383-388):
```ts
const hasDinheiroManual = finalDinheiroMp > 0;
const cashToConsolidateInBank = hasDinheiroManual ? 0 : finalDinheiroLojas;
```
- **O Erro Conceitual:** O código assumiu erroneamente que `Dinheiro MP` (Card 2, cofre da Matriz/Holding) e `Dinheiro no Cofre das Lojas` (Card 1, gavetas das filiais) seriam a mesma coisa.
- **O Efeito Devastador:** Como `dinheiroMpValor` era 19.526,00, `cashToConsolidate` foi forçado a ZERO.
- Quando o dinheiro das lojas está pendente (`em_transito`), ele NÃO está no banco (OFX não tem) e NÃO estava no Card 1 (zerado pelo flag). **R$ 3.918,50 simplesmente sumiu do patrimônio apurado.**
- Por isso, dar baixa ou não não mudava o saldo de Card 1!

### Causa-Raiz 2: Falta de Filtro de Status na RPC SQL (`get_daily_reconciliation_summary`)
Na RPC em execução no PostgreSQL:
```sql
SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
FROM store_cash_vault
WHERE entry_date = v_target_date::date;
```
- A query no banco não está filtrando estritamente `AND status IN ('em_transito', 'pending')`.
- Teste via Node.js comprovou: a RPC retornou `dinheiro_lojas: 23.578,50` (somou os R$ 3.918,50 pendentes E os R$ 19.660,00 que já tinham sido depositados!).
- No array de lojas (`v_stores_detail`), a RPC colocou para Planalto `dinheiro_loja = 4.130,00` em vez de R$ 1.750,00.

---

## 3. Solução Proposta

### 3.1. Frontend (`ResumoDiaPanel.tsx` e `useBackendConciliacao.ts`) [MODIFY]
1. Eliminar a trava `hasDinheiroManual`:
   - `cashToConsolidate = effectiveDinheiro` (sempre somar o dinheiro em trânsito das lojas no Card 1 `SALDO BANCOS + DINHEIRO`).
2. Atualizar Card 1 para exibir **R$ 162.826,27** (igualando rigorosamente ao modal `SaldoBancosDetailModal`).
3. Remover a tag confusa `(Consol. no MP)` do chip de Dinheiro no Cofre.

### 3.2. Banco de Dados / RPC (`get_daily_reconciliation_summary`) [MODIFY]
1. Aplicar migração SQL garantindo que `v_dinheiro_lojas` e o `vault_agg` por filial na RPC filtrem exclusivamente:
   ```sql
   WHERE entry_date = v_target_date::date 
     AND status IN ('em_transito', 'pending')
   ```
2. Garantir que a baixa via `dar_baixa_dinheiro` transite o registro de `em_transito` para `depositado` e reflita tanto no cofre quanto no banco sem duplicidade.

---

## 4. Risco Principal e Mitigação
- **Risco:** Alterar o Caixa Atual ao adicionar R$ 3.918,50.
- **Mitigação:** O Caixa Atual passa a refletir a realidade física: os R$ 3.918,50 estão nas filiais e são ativos da empresa. A conciliação fica íntegra e sem pontas soltas.
