# Proposal: Redesign do Painel de Orquestração dos Agentes de Importação (230)

## 1. Contexto e Diagnóstico
A tela da Etapa 4 da Central de Importações (Gravação do Lote) possuía elementos visuais estáticos (cards quadrados no topo e barra de gradiente convencional) que poluíam a interface e enfraqueciam a percepção de atuação inteligente dos agentes de IA.

## 2. Nova Experiência Proposta (Foco 100% no Processo dos Agentes)

### A. Eliminação de Ruídos Visuais
- Remoção dos 4 cards estáticos redundantes e da barra de gradiente pesada no topo.
- Centralização da tela no fluxo de **Orquestração Multi-Agente em Tempo Real**.

### B. Novo Design dos Agentes Especialistas (`AgentStageItem.tsx` e `CentralImportWizard.tsx`)
1. **Header Tecnológico com Telemetria de IA:**
   - Ícone de IA pulsante (`Sparkles` / `Bot`).
   - Título: **"Orquestração dos Agentes de Conciliação"**.
   - Subtítulo: *"Agentes autônomos processando, deduplicando e consolidando o fechamento financeiro no banco de dados."*
   - Status dinâmico em tempo real (`🤖 Agentes em Execução...` $\rightarrow$ `✨ Todos os Agentes Concluíram com Sucesso`).

2. **Linha de Execução dos 4 Agentes Especialistas:**
   - **🚗 Agente de Ingestão de OSs:** Ingestão de ordens abertas e em pátio, cálculo de dias em aberto e status de veículos.
   - **💳 Agente de Maquininhas & Taxas:** Auditoria de vendas de cartões (Rede), apuração de taxas contratuais e datas de liquidação.
   - **🏦 Agente de Extrato Bancário OFX:** Parsing de arquivos bancários Itaú, identificação de PIX de clientes e isolamento de movimentações corporativas.
   - **⚡ Agente do Motor de Conciliação:** Execução do pareamento atemporal 1:1, baixa de divergências e persistência do snapshot oficial.

3. **Interatividade e Visual de Alta Tecnologia:**
   - Cada card de agente possui barra de status sutil integrada, spinner luminoso quando ativo, transições suaves via Framer Motion, e expansão elegante de sub-etapas com tags coloridas e timestamps.
   - Terminal de logs de depuração integrado com visual CLI escuro e formatação limpa.
   - Painel de conclusão elegante com resumo das estatísticas persistidas e botão direto para o Painel de Conciliação.
