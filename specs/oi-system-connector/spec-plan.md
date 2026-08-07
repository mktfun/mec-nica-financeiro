# Spec Plan: Oficina Inteligente System Connector (oi-system-connector)

## Tasks

- [/] [BACKEND/AI] Atualizar `supabase/functions/ai-chat/index.ts`:
  - [/] Reescrever `systemPrompt` para incluir os 5 domínios (OS, Financeiro, Estoque, Agenda, Config) e a instruçÁo clara de identificaçÁo prévia da intençÁo.
  - [/] Substituir/Remover tools legadas vagas de OS.
  - [/] Adicionar declaraçÁo da tool `consulta_os_detalhe_completo` com as instruções corretas de uso (para buscas únicas detalhadas).
  - [/] Adicionar declarações de interface (Zod) para placeholders de ferramentas futuras (`consulta_contas_pagar_exposicao`, `consulta_fluxo_caixa`, `consulta_estoque_baixo`, `consulta_agenda_dia`).
- [x] [BACKEND/BOT] Atualizar `bot/src/scrapers/oficina.ts`:
  - [x] Criar funçÁo `fetchOSDetailedView(page, osNumber)` que navega até o formulário mestre da OS (ex: abrir o ícone de lápis ou visualizar) e raspa: Cabeçalho, aba Produtos/Serviços e aba Pagamentos.
- [/] [BACKEND/BOT] Atualizar `bot/src/server.ts`:
  - [/] Adicionar endpoint `GET /api/os/detalhe/:id` que retorna os dados extraídos pelo `fetchOSDetailedView`.
- [ ] [TEST] Verificar cenário 1: Fazer chamada `GET /api/os/detalhe/1044` e garantir que retorne os produtos e pagamentos com percentual pago.
- [ ] [TEST] Verificar cenário 2: Simular chamada LLM no DevTools Inspector e validar que a intençÁo "Financeiro" roteia para a tool de Caixa e nÁo a tool de OS.
