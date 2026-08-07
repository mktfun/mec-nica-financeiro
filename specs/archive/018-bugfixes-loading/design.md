# Design - 018 Bugfixes & Loading

## Banco de Dados (Supabase)
- Não há necessidade de alterações de *schema* (migrações). O ajuste será estritamente na Edge Function / lógicas do cliente no arquivo `useImportProcessor.ts`.
- O código atual não faz atualizações em recebíveis duplicados para poupar requisições (idempotência). A regra será alterada para fazer um UPDATE de `status` usando as chaves de identificação se o status atual (`existingRecs`) for `'pendente'` e o novo status avaliado no momento da importação for `'recebido'`.

## Interface e UI (Stitch MCP / UX 2026)
### Componente `LoadingSpinner`
- O atual spinner de anel tracejado (`strokeDasharray="30 100"`) será completamente removido.
- **Nova Abordagem (Minimal Pulse / Liquid):** Vamos implementar um loader que utiliza formas geométricas preenchidas com as cores da marca de maneira translúcida (`opacity` e `blur`), pulsando com a suavidade do Framer Motion.
- **Design Apple Liquid Glass:** Adicionar brilho interno suave e movimento fluido para que ele pareça orgânico. Ao invés de rodar, ele respira e pulsa.
- Caso possua o texto "Carregando...", a fonte será renderizada com opacidade fluida.

### UX da Importação
- Nenhuma mudança visual na tela de importação, apenas o comportamento no Toast de Sucesso que continuará notificando a importação bem-sucedida, com os dados da interface atualizando em tempo real os status de recebíveis.
