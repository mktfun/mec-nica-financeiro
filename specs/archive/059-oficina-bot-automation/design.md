# Design: AutomaçÁo Híbrida de ImportaçÁo e Fix do Agente IA (059-oficina-bot-automation)

## Arquitetura Técnica
A arquitetura se divide em duas esteiras: **SincronizaçÁo em Massa (Resumos)** e **Consultas Sob Demanda (Detalhes)**.

```
ESTEIRA 1: SincronizaçÁo Automática (Contas a Pagar e Lista de OSs)
[ Edge Function: sync-oficina ] ---> [ BOT API: /api/contas-pagar, /api/os-lista ] ---> [ Tabela: oficina_contas, oficina_os_resumo ]
   (Disparado via UI ou Cron)

ESTEIRA 2: Inteligência Artificial (Detalhes e Peças da OS)
[ Agente IA ] ---> Pergunta sobre OS 22551
      │
      ▼
[ Cache Hit? ] ---> Tabela `oficina_os_cache`
      ├─ Sim, e está FINALIZADA ---> Retorna JSON na hora (0.1s).
      ├─ Sim, mas NÁO FINALIZADA ---> Faz fetching do bot para ver se mudou algo.
      └─ NÁo existe ---> Faz fetching do bot (Timeout expandido para 45s).
              │
              ▼
       [ Salva/Atualiza o Payload na Tabela Cache ]
```

## Interfaces TypeScript
```typescript
interface SupabaseOSCache {
  id: string; // uuid
  store_id: string;
  os_number: string;
  status_cache: string; // "ORCAMENTO", "ANDAMENTO", "FINALIZADO"
  payload_completo: any; // JSON inteiro retornado pelo bot
  updated_at: string;
}
```

## Componentes / Hooks / Funções
1. **`supabase/functions/sync-oficina/index.ts`** (NOVO): Para buscar as listas de resumos (Contas e OSs) e alimentar as tabelas que substituem o CSV.
2. **`supabase/functions/ai-chat/tools-oficina.ts`** (MODIFICADO):
   - ExpansÁo do `AbortSignal` para `45000` ms.
   - RefatoraçÁo da `consulta_os_detalhe_completo` para implementar a lógica do Cache Condicional baseada no status "FINALIZADO" ou similar.
3. **`src/components/importacoes/CentralImportWizard.tsx`** (MODIFICADO): AdiçÁo da opçÁo de disparar a Edge Function `sync-oficina`.
