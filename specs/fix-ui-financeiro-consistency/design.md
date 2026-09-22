# Arquitetura de Fluxo (SSOT e Conciliação Transacional)

## 1. Arquitetura de Fluxo 

Source (Usuário edita/baixa no Front) -> Modal de Baixa Dinheiro -> Payload Zod Sanitizado -> Supabase RPC (`dar_baixa_dinheiro`)
1. **O Backend (RPC)** abre uma `TRANSACTION` com nível `READ COMMITTED`.
2. A RPC trava os registros com `SELECT ... FOR UPDATE` (Pessimistic Lock) nas tabelas `store_cash_vault` e `daily_manual_bills`.
3. Valida saldos suficientes (para impedir que o frontend simule um saldo disponível fantasma).
4. Aplica os débitos, muda status e insere rastro.
5. Em caso de sucesso, `COMMIT`. Retorna o sumário da transação.
6. A Mutação no Front end usa o retorno `success` e realiza invalidação das chaves React Query.
7. A tela **ResumoDiaPanel** faz *reload* baseado *exclusivamente* no sumário re-agregado no servidor. O salvamento em `metadata` do snapshot **NÃO** guarda estado paralelo (redundante) das caixas "Cofre" ou "Totais manuais", atuando estritamente como um registro histórico.

## 2. Design System & UI Standards
- Não haverá adição de novos componentes UI ou novos modais no primeiro momento (fase de correção cirúrgica).
- Utilizaremos componentes `shadcn/ui` já instanciados. `toast` (Sonner) informará falhas ou validações explícitas vindas da camada RPC (Zero AI Slop - Mensagens precisas, técnicas e diretas).

## 3. Interfaces TypeScript Reais

```typescript
// Nenhuma nova interface, correção da assinatura e tipo de retorno estrito na mutação existente.
export interface BaixaDinheiroResponse {
  success: boolean;
  message?: string;
  error?: string;
  new_balance?: number;
}
```

## 4. Cenários Obrigatórios

### Happy Path:
O usuário dá baixa em dinheiro. A RPC executa o `FOR UPDATE`, valida saldos e devolve sucesso. O modal no Front encerra e informa sucesso. A tela base (ResumoDiaPanel) atualiza os totais e o dinheiro da conta reduz corretamente. Ao clicar "Editar Fechamento", o Painel não restaura totais perdidos; os totais dependem das linhas vivas do banco.

### Edge Case (Race Condition):
Dois operadores (ou o mesmo apertando o botão múltiplas vezes) tentam dar baixa simultaneamente na mesma conta.
A RPC executa travamento de linha (`FOR UPDATE`). A segunda tentativa detecta falha e devolve `{ success: false, error: '...' }`. O modal do front bloqueia e levanta um `toast.error`, não gerando "falso positivo" (UI atualizando sem real efetivação no BD).

## 5. Critérios de Aceitação Verificáveis
1. **Build e Teste de Tipos (Terminal Gate):** `npm run build` deve passar sem erros após as refatorações.
2. **Imutabilidade e Consistência (SQL):** Ao dar baixa de um registro do cofre de R$ 5.000 via RPC `dar_baixa_dinheiro`, esse valor é deduzido corretamente do saldo do cofre e é efetivado na saída, não ocorrendo dupla efetivação.
3. **Sem Efeito Rebote no Frontend:** Se eu abrir o ResumoDiaPanel e clicar em `Editar Fechamento` -> `Salvar`, os itens do `store_cash_vault` manterão status de `depositado` inalterados, o `dinheiro_lojas` não voltará aos R$24k antigos e o total de `Contas Manuais` permanecerá refletindo a operação.

## 6. Cenários de Teste (Inference Rules)
- **Zero Skeletons falsos:** Loading state desabilita os botões de ação e aplica *debounce* nas mutações durante o aguardo da RPC.
- **Empty States precisos:** Se o cofre tiver saldo total igual a zero após a refatoração e limpezas adequadas, a UI mostrará que não existem recursos na loja sem calcular montantes virtuais inconsistentes.
