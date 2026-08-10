# Proposal: Automação Pátio OS Multi-mês (Bot OI) - 154

## Problema
Atualmente, as "OSs Restantes" em pátio não batem porque o processo de extração não contempla cruzamento de meses. A Oficina Inteligente (OI) bloqueia nativamente a extração de relatórios de OS contendo 2 meses simultâneos. Extrair isso manualmente loja a loja, mês a mês, e enviar para a conciliação é um trabalho hercúleo.

## Solução Proposta
Ampliar o bot Puppeteer (Puppeteer Headless que roda na VPS / SSH) para ter uma estratégia de **"Iteração Multi-mês"**. Em vez de o bot receber apenas um `targetDate`, ele receberá uma instrução de fatiamento.
Quando ordenado a baixar os carros em pátio, o Bot:
1. Loga no portal da Oficina Inteligente.
2. Faz um loop por cada Loja (selecionando-a no menu do sistema).
3. Para cada loja, faz 2 downloads sequenciais de Excel:
   - Extrai o relatório Excel de OSs do mês passado (01/M-1 a 31/M-1).
   - Extrai o relatório Excel de OSs do mês atual (01/M a Data Atual).
4. O bot consolida internamente e dispara esses Excels para o banco do Supabase ou mescla os dados JSON lidos e injeta na tabela `patio_os`.

## Contratos de Dados
- **Tabelas Envolvidas:** Tabela `patio_os` ou `os_transactions` (as OSs processadas virão combinadas e farão *Upsert* pelos `os_number`). 
- **Payload do Bot:** `{ mode: "historical_patio", currentMonth: "2026-08", previousMonth: "2026-07" }`.

## API / Interface
- **Bot:** Modificar endpoint `POST /api/sync/oficina` para aceitar parâmetros de meses abrangentes. 
- **Frontend (Painel Administrativo):** Um botão novo "Sincronizar Pátio (Últimos 2 Meses)" na tela de lojas ou configurações globais, que fará a trigger pro endpoint do Bot.

## Features Existentes Impactadas
- O scrapper em `bot/src/scrapers/oficina.ts` ganhará a inteligência de trocar os meses na interface do OI e concatenar downloads. 
- O arquivo `bot/src/runner.ts` será estendido para gerir o array de relatórios.

## Risco Principal
- **Probabilidade:** Média
- **Impacto:** Parcialmente Reversível
- **Mitigação:** Como o bot baixará dois arquivos Excel, o risco é o tempo da sessão expirar ou o site OI bloquear por lentidão (timeout). A mitigação será rodar a extração sequencial por loja de forma pausada (delay de 2-3s entre navegações) e fazer o upsert lote a lote no banco.
