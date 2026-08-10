# Design: Painel Detalhado de Fontes de Dados (149-conciliation-details)

## Arquitetura Técnica
Toda a lógica de extração será delegada ao PostgreSQL. O frontend apenas chamará RPCs e renderizará a resposta.
Componente Pai (`ImportSourceBadges`) → Estado do Modal Aberto → Componente Filho (`RawOsTable`, etc) → Hook `useQuery` → Supabase RPC (`get_raw_os_data`, etc) → Render.

## Interfaces TypeScript

```typescript
// Componente de Badges
interface ImportSourceBadgesProps {
  storeId: string;
  targetDate: string;
}

// OSs (Resposta da RPC)
interface RawOsRecord {
  os_number: string;
  opened_at: string;
  closed_at: string | null;
  status: string;
  total_value: number;
  paid_value: number;
  remaining_value: number; // Calculado pela RPC
  payment_method: string | null;
}

// Maquininha (Resposta da RPC)
interface RawRedeRecord {
  id: string;
  gross_amount: number;
  net_amount: number;
  fee_amount: number;
  fee_percentage: number; // Calculado pela RPC (fee_amount / gross_amount * 100)
  matched_os_number: string | null;
}

// Bancário (Resposta da RPC - wrapper para agrupar limite e transações)
interface RawOfxResponse {
  account_limit: number | null;
  previous_balance: number | null; // Tirado da reconciliations do dia anterior
  transactions: {
    id: string;
    amount: number;
    type: string;
    description: string;
    occurred_at: string;
    fitid: string | null;
  }[];
}
```

## Componentes / Hooks / Funções

- **`supabase/migrations/...raw_data_rpcs.sql`**: Migration criando `get_raw_os_data`, `get_raw_rede_data`, e `get_raw_ofx_data`.
- **`src/components/conciliacao/ImportSourceBadges.tsx`**: Contém o layout de 3 Badges e os modais.
- **`src/components/conciliacao/RawOsTable.tsx`**: Tabela simples mostrando OSs do dia (consumindo RPC).
- **`src/components/conciliacao/RawRedeTable.tsx`**: Tabela consumindo a RPC da Rede.
- **`src/components/conciliacao/RawOfxTable.tsx`**: Header exibindo limite de conta e saldo (consumindo a RPC do OFX). Tabela abaixo com as transações.
- **`src/hooks/useRawImportData.ts`**: Conjunto de queries (`useRawOs`, `useRawRede`, `useRawOfx`) chamando `.rpc()`.

## Fluxo de UI
1. O usuário entra em `/conciliacao/ID_DA_LOJA`.
2. Abaixo de "Data alvo: DD/MM/YYYY", vê três Badges discretas.
3. Ao clicar no Badge "Excel OS", um `Modal` abre ao centro da tela, disparando a requisição para a RPC correspondente apenas neste momento.
4. O modal carrega uma tabela clássica com os dados.
5. Padrão visual escuro (Zinc-950), tipografia Inter.

## Infra / Deploy
Deploy padrão de migrations Supabase.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** [Usuário clica no badge "Rede"] → [Chama RPC] → [Tabela renderiza o fee_percentage já calculado no banco].
- **Cenário 2:** [Loja sem account_limit configurado] → [Abre modal do OFX] → [RPC retorna account_limit = null] → [Frontend exibe "Limite: Não configurado"].
