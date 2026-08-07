# Proposal: Oficina Inteligente System Connector (oi-system-connector)

## Problema
O agente do webapp atualmente é focado de forma "míope" como um mero robô de consulta de OS (e de forma limitada à grid). Isso causa dois grandes problemas:
1. Respostas rasas para OSs específicas, entregando apenas o resumo de grid quando o usuário pede "a OS completa" (incluindo pagamentos, itens e executor).
2. A IA não aproveita o escopo completo do sistema (Financeiro, Estoque, Agenda), tratando o sistema inteiro como se fosse apenas sobre OS.

## Solução Proposta
Evoluir o agente de um "Leitor de Grid de OS" para um **Conector Sistêmico do Oficina Inteligente**.
Para isso, devemos:
1. **Routing Cognitivo:** Atualizar o System Prompt da Edge Function (`ai-chat/index.ts`) para forçar a identificação do domínio (OS, Financeiro, Estoque, Config) antes de escolher a tool.
2. **Nova Tool de Domínio Específico:** `consulta_os_detalhe_completo` para substituir buscas vagas de OS. Essa tool extrairá as 3 abas principais da OS (Cabeçalho, Serviços/Produtos e Pagamentos).
3. **Catálogo de Tools Ampliado (Placeholders V1):** Declarar explicitamente tools de outros domínios para que a IA saiba que elas existem e consiga rotear a intenção.

## Contratos de Dados
O endpoint `GET /api/os/detalhe/:id` (ou equivalente no bot VPS) retornará:
```json
{
  "osNumber": "1763",
  "loja": "X",
  "cliente": "Fulano",
  "veiculo": "Gol JSX9E04",
  "responsavel": "Mecânico Y",
  "status": "Em execução",
  "valorTotal": 4026.66,
  "valorPago": 2150.00,
  "itens": [
    { "descricao": "Troca de óleo", "tipo": "servico", "quantidade": 1, "valorTotal": 150.00 }
  ],
  "pagamentos": [
    { "data": "28/07/2026", "forma": "PIX", "valor": 2150.00 }
  ]
}
```

## API / Interface
- Edge Function `ai-chat/index.ts`: Modificação do `systemPrompt` e das declarações de `mcpTools`.
- Bot VPS `server.ts` & `oficina.ts`: Novo endpoint e função de extração que navega para o detalhe da OS.

## Features Existentes Impactadas
- `ai-chat/index.ts`
- Bot VPS (`bot/src/server.ts`)

## Risco Principal
Extrair os detalhes completos de uma OS exige navegação extra no ASP.NET além da Grid, o que pode esbarrar em modais bloqueantes, lentidão ou IDs de abas complexas (ex: abas AJAX em vez de URLs novas).
