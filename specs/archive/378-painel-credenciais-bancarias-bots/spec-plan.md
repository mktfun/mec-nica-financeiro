# Spec Plan: Painel de Gerenciamento de Credenciais Bancárias dos Bots de Automação (378)

## Tasks Atômicas

- [x] `[DB-MIGRATION]` **Criação da Tabela `bank_bot_credentials` e Políticas de RLS**
  - Criar migration `supabase/migrations/20260908000037_bank_bot_credentials.sql`.
  - Definir campos `store_id TEXT REFERENCES stores(id)`, `bank_code`, `bank_name`, `agency`, `account_number`, `operator_cpf`, `encrypted_password`, `access_type`, `is_active`, `last_status`, `last_sync_at`, `last_error`.
  - Configurar constraint `UNIQUE(store_id, bank_code, account_number)` e índices de performance.
  - Habilitar RLS restringindo permissões de leitura/escrita estritamente a administradores (`profiles.role = 'admin'`).
  - *Critério de Verificação*: Migration aplicada no Supabase via script headless com exit code 0.

- [x] `[CRYPTO-UTILS]` **Utilitário de Criptografia Simétrica e Máscaras de Dados**
  - Criar `src/lib/credentialCrypto.ts`.
  - Implementar cifra reversível `encryptBankPassword` e `decryptBankPassword` com suporte a AES-GCM / Web Crypto.
  - Implementar funções de formatação e mascaramento de CPF (`maskCpf`, `formatCpf`, `cleanCpf`) e formatação de contas bancárias.
  - *Critério de Verificação*: Teste unitário/script valida que a senha é cifrada, salva em formato não-legível e decifrada com 100% de exatidão.

- [x] `[FRONTEND-HOOKS]` **Hook React Query `useBankBotCredentials.ts`**
  - Implementar queries para listar contas cadastradas com join em `stores(name, code)`.
  - Implementar mutations para inserção, edição, exclusão e disparo de teste de conexão com o robô.
  - Configurar invalidação automática de cache em `['bank_bot_credentials']` com toasts de feedback via Sonner.
  - *Critério de Verificação*: Hook permite executar operações CRUD completas no Supabase com tipagem TypeScript estrita.

- [x] `[FRONTEND-MODAL]` **Modal de Conexão e Edição `BankBotCredentialModal.tsx`**
  - Criar modal acessível com suporte a Dark UI Zinc-950.
  - Implementar campos: Select de Bancos (Itaú, Bradesco, Santander, BB, Caixa, Inter), Select de Lojas (populado via `useStores()`), Inputs com máscaras para Agência, Conta Corrente e CPF do Operador.
  - Implementar input de senha com botão de toggle de visibilidade (`Eye` / `EyeOff`) e regra de senha não obrigatória em modo de edição (preserva senha salva).
  - Adicionar seletor de tipo de acesso (`Acesso Completo` vs `Apenas Consulta`) e switch de ativação.
  - *Critério de Verificação*: O modal valida campos obrigatórios e submete os dados cifrados com sucesso.

- [x] `[FRONTEND-CARDS]` **Painel de Cards Bancários `BankBotCredentialsPanel.tsx`**
  - Construir grid responsivo de cartões com tema visual por instituição financeira.
  - Exibir logo do banco, badge da loja vinculada, agência/conta destacadas e CPF mascarado com botão de olho para visualização temporária.
  - Exibir badges de status visual (`🟢 Conectado`, `🟡 Pendente iToken`, `🔴 Erro de Login`, `⚪ Não Testado`).
  - Incluir botões de ação: `[Testar Conexão / Rodar Bot]`, `[Editar]` e `[Excluir]`.
  - Implementar filtros de busca por texto e pílulas por status.
  - *Critério de Verificação*: Grade de contas renderiza com fluidez e responsividade total.

- [x] `[INTEGRATION-CONFIG]` **Integração na Tela `/configuracoes` e no Módulo `bot/`**
  - Integrar `<BankBotCredentialsPanel />` na aba "Motor & Lojas" de `ConfiguracoesPanel.tsx`.
  - Exportar helper `getBankBotCredentials` em `bot/src/sync/supabaseUploader.ts` para consumo pelo extrator Playwright (`itau-runner.ts`).
  - *Critério de Verificação*: Acessar `http://localhost:8080/configuracoes` na aba "Motor & Lojas" e visualizar o painel pronto e funcional.

- [x] `[BUILD-GATE]` **Auditoria de Build e Integridade TypeScript**
  - Executar `cmd.exe /c "npm run build"` e garantir 0 erros de compilação.
  - *Critério de Verificação*: Build executado com sucesso e tela acessível sem erros em `http://localhost:8080/configuracoes`.
