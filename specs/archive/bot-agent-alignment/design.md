# Design: bot-agent-alignment (Bot Agent Alignment)

## Arquitetura Técnica
A arquitetura de integração passa a ser puramente distribuída e acessível publicamente pelo Agente de IA, sem depender de túneis locais de IP durante o raciocínio.
`Agente IA (ai-chat)` → `fetch(https://bot.tork.services/api/os/detalhe/:id)` → `Cloudflare Tunnel` → `Traefik` → `ConciliaMec Bot (VPS)` → `Supabase Logs` → Retorno.

## Interfaces TypeScript
```typescript
export interface OSDetailedRecord {
  osNumber: string;
  loja: string;
  cliente: string;
  veiculo: string;
  responsavel: string;
  status: string;
  valorTotal: number;
  valorPago: number;
  itens: Array<{
    descricao: string;
    tipo: string;
    quantidade: number;
    valorTotal: number;
  }>;
  pagamentos: Array<{
    data: string;
    forma: string;
    valor: number;
  }>;
}
```

## Componentes / Hooks / Funções
1. **Edge Function `ai-chat`:** 
   O `systemPrompt` receberá reforços para tratar URLs públicas via ferramentas declaradas. A ferramenta `consulta_os_detalhe_completo` será mantida, mas a injeção do contexto enfatizará a dependência exclusiva do `bot.tork.services`.

2. **Scraper `oficina.ts` (`fetchOSDetailedView`):** 
   O trecho que gera o arquivo HTML temporário (`require('fs').writeFileSync('../../tmp/debug_detail.html', html)`) será protegido com bloco `try/catch` para capturar a falha silenciosamente caso o diretório `tmp` não exista (ou será verificado e garantido com `fs.mkdirSync`), ou simplesmente removido na lógica final para ambiente de produção, eliminando o erro fatal (ENOENT).

## Fluxo de UI
A UI do Agent DevTools fará o acionamento padrão da Edge Function, mas sob o capô a ferramenta fará o fecth real. A interface `MessageList.tsx` continuará consumindo a requisição via SSE de texto + logs da tool no Supabase.

## Infra / Deploy
- O domínio `bot.tork.services` é servido pelo Cloudflare Tunnel.
- O Agente acessa o bot pelo header `x-api-key`.
- Nenhuma dependência do ambiente `localhost`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Edge Function] → [System Prompt alterado] → [O agente atende às guidelines impostas]
- Cenário 2: [Chamada Remota Pública] → [Fazer GET com apiKey para bot.tork.services] → [JSON OSDetailedRecord 1044 extraído com sucesso]
- Cenário 3: [Remoção do ENOENT] → [Executar script scraper] → [Não falha por erro de File System]
