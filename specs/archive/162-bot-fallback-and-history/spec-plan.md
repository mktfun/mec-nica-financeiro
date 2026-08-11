# Spec Plan: Cloud Sync Imersivo e Auto-Fallback do Pátio (162)

## Tasks

- [x] [BACKEND] Modificar edge function `sync-oficina` (e código do bot Playwright no repositório do bot, se aplicável, ou via interface API) para que a extração de OS inclua sempre o mês passado (01 a 31 do mês anterior) e o dia atual. O payload da API deve aceitar ou forçar essa janela de busca para abranger todas as OS pendentes recentes.
- [x] [FRONTEND] Criar componente `ManualOsFallbackForm.tsx` em `src/components/importacoes/` que permita inserir linhas dinâmicas de OS com: Número, Loja, Valor Total e Valor Pago. Deve retornar um array com formato compatível com o import de OS.
- [x] [FRONTEND] Atualizar `AgentRunnerModal.tsx` para gerenciar 3 tentativas (`retries`) quando `fetch('/api/sync-oficina')` falhar, com delays de 2s entre tentativas.
- [x] [FRONTEND] Atualizar `AgentRunnerModal.tsx` para apresentar em paralelo o progresso dos arquivos em importação, acionando o callback unificado apenas quando ambos terminarem.
- [x] [FRONTEND] Refatorar `CentralImportWizard.tsx` (Step 2/3) para instanciar a nova `AgentRunnerModal.tsx` no instante do clique de processamento dos arquivos anexados. 
- [x] [FRONTEND] Alterar `CentralImportWizard.tsx` para gerenciar o estado `needsFallback`. Caso a modal avise que houve 3 falhas, redirecionar o usuário para o Passo 3.5 com o `ManualOsFallbackForm` antes de ir ao Resumo.
- [x] [FRONTEND] Na consolidação final (onde ocorre o cálculo do Pátio e auto-save da Spec 148), mesclar o resultado extraído via Bot ou via Fallback Manual junto com o extrato OS para realizar os upserts em `pos_transactions` e `reconciliations`.
- [x] [TEST] Simular sucesso no bot: certificar que os pátios OS estão combinando retroativos (mês passado) na tela global.
- [x] [TEST] Simular erro crítico (desligar API mockada): certificar que o bot tenta 3x, exibe erro, libera fallback, preencher 1 OS manual e verificar se entra no cálculo perfeitamente.
