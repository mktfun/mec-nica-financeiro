# Design: Backend Conciliation Math & Audit Logs (107-backend-conciliation-log)

## Arquitetura Técnica
React Component (`conciliacao.index.tsx`) 
  → Hook (`useBackendConciliacao`)
  → Supabase RPC (`get_daily_conciliation(p_date)`)
  → Lógica PostgreSQL:
      - Agrupa valores das tabelas `transactions`, `patio_os`, `receivables`.
      - Efetua cálculos (Diferença = Previsto - [PIX + Maquininha]).
      - Faz o UPSERT (snapshot 1 dia) na tabela `conciliation_daily_logs`.
  → Retorna array de `StoreConciliationResult` 
  → React Component (Exibe números pré-calculados).

## Interfaces TypeScript
```typescript
export interface ConciliationDailyLog {
  id?: string;
  date: string;
  store_id: string;
  faturamento_banco: number;
  maquininha: number;
  pix: number;
  na_loja_os: number;
  previsto_ofx: number;
  diferenca: number;
  created_at?: string;
}
```

## Componentes / Hooks / Funções
- `supabase/migrations/<timestamp>_create_conciliation_logs.sql`: Migration responsável por criar a tabela de logs audicionáveis e a RPC matemática.
- `src/hooks/useBackendConciliacao.ts` (Novo): Hook limpo e direto para evocar a RPC e retornar os dados prontos.
- `src/routes/conciliacao.index.tsx` (Modificado): Remoção completa da lógica de reduções (`.reduce`) em memória; consumirá exclusivamente o retorno da RPC.

## Fluxo de UI
1. O usuário abre a aba de Conciliação e seleciona um dia.
2. O frontend chama a RPC, que realiza a auditoria/cálculo em tempo real (ou retorna o cache instantâneo se já calculado para aquele dia).
3. A tela "Fechamento por Loja" exibe exatamente os valores computados pelo backend, sem variações baseadas no estado da árvore DOM do React.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: Acessar um dia passado com dados imutáveis já processados.
  - Ação: O backend recalcula e atualiza a tabela `conciliation_daily_logs`. 
  - Resultado: Os logs gravados refletem os mesmos números da tela, permitindo auditoria no banco.
- **Cenário 2**: Cálculo de Diferença correto.
  - Ação: A tela carrega.
  - Resultado Esperado: `Diferença` reflete exatamente a matemática solicitada (`previsto_ofx - (pix + maquininha)`).
