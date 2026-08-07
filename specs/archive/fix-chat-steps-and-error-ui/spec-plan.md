# Spec Plan: Passo a Passo Expansível, Tratamento de Erros Limpo e Prevenção de Respostas Vazias (fix-chat-steps-and-error-ui)

## Tasks

- [x] [FRONTEND] Criar o componente `StepAccordion` em `src/components/chat/MessageList.tsx` para renderizar o passo a passo expansível de ferramentas e raciocínio (igual ChatGPT / Perplexity)
- [x] [FRONTEND] Atualizar `MessageList.tsx` para suprimir a renderização de balões de texto escuro quando `textContent` for vazio, evitando caixas pretas vazias
- [x] [FRONTEND] Adicionar formatador/sanitizador de erros limpos em `agente.tsx` e `MessageList.tsx` para exibir erros formatados e compactos
- [x] [TEST] Executar teste E2E via Playwright (`node test_e2e.js`) enviando a mensagem da OS `22551` no Rei do Óleo Mauá, capturando screenshot para validar o passo a passo expansível e a ausência de mensagens vazias/duplicadas
