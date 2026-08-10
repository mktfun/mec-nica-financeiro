# Design: Pátio OS Cumulativo na Conciliação (Backlog Histórico) - 155

## Arquitetura Técnica
Toda a alteração será contida estritamente na camada de dados (PostgreSQL/Supabase).
Ao invés de processar o filtro no Frontend, atualizaremos as `Functions` que o Supabase exporta para consumir a tabela `patio_os`.

A condição atual de filtro que existe nessas RPCs:
```sql
WHERE po.store_id = p_store_id
  AND (po.opened_at::date = p_date OR po.closed_at::date = p_date)
```

Será substituída pelo conceito de "Acúmulo Histórico Restante":
```sql
WHERE po.store_id = p_store_id
  AND po.opened_at::date <= p_date
  AND (
    (COALESCE(po.total_value, 0) - COALESCE(po.paid_value, 0)) > 0
    OR po.opened_at::date = p_date
    OR po.closed_at::date = p_date
  )
```
*Isso garante que: (1) OSs abertas ou fechadas hoje aparecem. (2) OSs antigas que ainda tenham dívida pendente também aparecem, não sumindo do radar.*

## Interfaces TypeScript
*Nenhuma interface Typescript sofrerá modificação estrutural. Os DTOs das RPCs permanecem intactos, apenas o volume de dados da Collection retornada aumentará.*

## Componentes / Hooks / Funções
1. **[SQL MIGRATION NOVA]**: Criaremos uma migration `.sql` para substituir as três principais funções afetadas:
   - `get_raw_os_data`: (Para garantir que o novo Extrato mostre o backlog correto se clicar para auditar a OS).
   - `get_conciliation_breakdown`: A view da aba "Na Loja OS" vai renderizar tudo o que vier do banco.
   - `get_patio_summary` / `calculate_daily_conciliation` (se existir nas agregações globais da Home).
2. Não tocaremos em Frontend.

## Fluxo de UI
1. O usuário entra na conciliação no dia 05/Agosto.
2. Não foi feito download do Pátio desse dia, ou só de 05/Agosto.
3. No entanto, em Julho o usuário tinha OSs registradas. 
4. Essas OSs antigas com saldo a receber saltarão aos olhos na soma e na aba "Na Loja OS", identificadas pela data antiga.
5. Se não tiver nada pendente importado antes, o saldo será R$ 0.00.

## Infra / Deploy
Uma migration SQL convencional a ser rodada no Supabase vinculado.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Criar/Verificar uma `patio_os` fictícia de `2026-07-01` com `remaining_value = 500`. Entrar na conciliação de `2026-08-10`. Ela deve aparecer na lista de OSs no BreakdownModal e somar ao Pátio total.
- **Cenário 2:** Atualizar a OS do Cenário 1 para `remaining_value = 0` (fechada). Ela deve DEIXAR de aparecer na conciliação de `2026-08-10`, mas continuar aparecendo na conciliação do dia que foi fechada.
