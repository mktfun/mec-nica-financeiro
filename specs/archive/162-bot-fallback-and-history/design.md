# Design: Cloud Sync Imersivo e Auto-Fallback do Pátio (162)

## Arquitetura Técnica
`CentralImportWizard` orquestra:
1. Usuário faz upload de arquivos OFX e XLSX.
2. Inicia-se o processamento ("Sync & Import").
3. A modal `AgentRunnerModal` é aberta. Nela:
   - Uma esteira visualiza a leitura dos arquivos locais.
   - Em paralelo, dispara o hook que chama a Edge Function `sync-oficina` passando o parâmetro de data (range = mês passado até hoje).
4. **Resiliência (Bot)**: Se o fetch `sync-oficina` der erro, o client-side aciona um retry com delay (máximo de 3 tentativas).
5. **Fallback (Se 3 falhas)**: A esteira do bot exibe "Falha Crítica". Ao clicar em Avançar, ao invés do passo final de resumo automático, a tela intercepta para o `ManualOsFallbackForm`, obrigando a digitação manual dos valores de OS do Mês Passado/Hoje que estariam pendentes (Loja, Num OS, Total, Pago).
6. **Consolidação**: Tanto os dados vindos via Bot (com sucesso) quanto os dados inseridos manualmente no Fallback são agregados ao array de `results` (assim como as planilhas manuais OS antigas) para serem importadas unificadamente e entrarem no `daily_snapshot`.

## Componentes / Hooks / Funções
- **`src/components/importacoes/CentralImportWizard.tsx`**: Reformulado para amarrar estado do bot (sucesso, error_count, needs_fallback) e injetar o Fallback Form.
- **`src/components/importacoes/AgentRunnerModal.tsx`**: Suporte visual expandido para as 3 tentativas e exibição paralela do progresso de Parsing Local.
- **`src/components/importacoes/ManualOsFallbackForm.tsx`**: Novo componente (lista interativa) para inserção das propriedades essenciais das OS.
- **Edge Function `sync-oficina`**: O payload precisará receber um daterange claro para o script Playwright extrair as contas do mês anterior e atual.

## Fluxo de UI
1. Usuário arrasta arquivos -> clica em Processar.
2. A UX Imersiva do Agente sobe na tela (modal escura).
3. Linhas de log aparecem animadas:
   - [Parser] Lendo OFX do Banco Itaú...
   - [Bot] Conectando à Oficina Inteligente (Tentativa 1/3)...
   - [Bot] Varrendo mês anterior e hoje...
4. Se der sucesso: Modal fecha (ou libera botão "Prosseguir") e exibe a tela "Tudo Certo".
5. Se der falha 3x: Modal libera botão "Preencher OS Manualmente". Ao clicar, o wizard vai pro passo `3.5` exibindo o `ManualOsFallbackForm`. 
6. Usuário preenche as OS, clica salvar. O fluxo retoma e finaliza no auto-save diário.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Sucesso Bot)**: Bot puxa os dados de OS pendentes sem timeout -> arquivos mesclados -> wizard consolida -> daily snapshot bate as OS do mês passado pendentes.
- **Cenário 2 (Falha Bot -> Fallback)**: Bot tenta 3 vezes e falha (ex: senha errada do OI) -> exibe tela manual -> usuário digita 1 OS de 2 mil reais -> salvar -> OS inserida na tabela OS e refletida no Pátio do snapshot.
