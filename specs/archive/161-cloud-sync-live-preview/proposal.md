# Proposal: Agent Flow Expandable & Live Preview (161v2)

## Problema
O feedback atual e a v1 proposta ainda são rudimentares. O usuário quer uma **experiência imersiva de Agente de IA (Agent UI)**. Durante a extração, ele quer ver os grandes estágios (ex: Conectando, Buscando Faturamentos, Injetando) e **dentro deles** ver os sub-passos detalhados, que se expandem/recolhem automaticamente conforme o progresso, evitando a impressão de tela travada.
Além disso, no final, os dados precisam ser consolidados para que ele os veja imediatamente no Preview (Step 3) em conjunto com as importações manuais, exatamente como se estivesse importando arquivos reais.

## Solução Proposta
1. **Agent Terminal Modal**: Construiremos um componente `CloudAgentRunner` que utiliza Accordions (Collapsibles) para listar os estágios.
2. **Sub-Steps Animados**: Cada estágio (ex: *Buscando faturamentos*) revelará logs de sub-etapas (*- acessando aba financeiro*, *- processando X arquivos*, *- analisando arquivo Y*). A animação usará Framer Motion para transições de altura suaves.
3. **Botão de Ação Pós-Agent**: Ao final (quando todos os ícones virarem ✅), o painel exibirá o botão "Finalizar e Ver Preview".
4. **Data Injection**: Ao clicar no botão final, a UI fará a busca no Supabase e injetará os `results` de forma síncrona na aba 3 (Preview) do CentralImportWizard.

## Contratos de Dados
O Edge Function continuará operando normalmente. O Frontend simulará a orquestração do polling das sub-tarefas para dar feedback fluído enquanto aguarda o dado pousar no banco, ou fará requisições cadenciadas caso o bot possua sub-endpoints. Se o bot for 100% fire-and-forget, usaremos heurística temporal progressiva para manter o UI vivo e consultar o Supabase no final até as rows aparecerem.

## Features Existentes Impactadas
Substitui completamente a lógica de botão simples no Step 1 do `CentralImportWizard` por um fluxo de Agent UX.

## Risco Principal
- **Probabilidade:** Média.
- **Impacto:** O bot demorar mais ou menos que o tempo simulado da interface caso não tenhamos WebSocket.
- **Mitigação:** O último passo "Injetado com sucesso no banco" fará um Polling ativo (de 3 em 3 segundos) na tabela `oficina_contas` para garantir que a UI só acabe quando os dados reais existirem.
