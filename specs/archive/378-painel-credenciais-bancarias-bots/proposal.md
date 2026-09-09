# Proposal: Painel de Gerenciamento de Credenciais Bancárias dos Bots de Automação (378)

## Problema
Atualmente, a extração de extratos bancários OFX pelas rotinas de automação via Playwright (`bot/src/itau-runner.ts`) depende de intervenção humana assistida (`waitForAuthenticatedSession`), na qual o operador precisa abrir o navegador, digitar manualmente agência, conta, CPF do operador e senha eletrônica no teclado virtual do portal Itaú Empresas. 

Além disso, a tela de Configurações (`/configuracoes`) possui apenas cadastro estático de credenciais de portais (`oficina_inteligente` e `rede`), não havendo interface para o gestor financeiro cadastrar, editar, auditar, proteger e testar as credenciais bancárias de cada filial de forma centralizada e segura.

## Solução Proposta (Foco em Reuso e Padrões Estabelecidos)
Implementar uma infraestrutura completa de gerenciamento de credenciais bancárias para os robôs de automação:
1. **Database & Segurança (Supabase)**:
   - Criação da tabela `public.bank_bot_credentials` associando cada conta à filial correspondente via `store_id TEXT REFERENCES stores(id) ON DELETE CASCADE`.
   - Criptografia simétrica reversível (AES-GCM / Web Crypto) para a senha de acesso bancário, garantindo que o banco de dados nunca armazene senhas em texto puro.
   - Ativação de Row Level Security (RLS) estrita: leitura e gravação permitidas exclusivamente para usuários com perfil `admin` (`profiles.role = 'admin'`), além do `service_role` utilizado pelo robô.
2. **Frontend UI & Experiência do Usuário (`/configuracoes`)**:
   - Criação do componente `BankBotCredentialsPanel.tsx` integrado à aba "Motor & Lojas" de `ConfiguracoesPanel.tsx`.
   - Botão de Ação Primária no topo: `[+ Conectar Nova Conta Bancária]`.
   - Grid de Cards em Dark UI Zinc-950 exibindo logo/identidade do banco (Itaú, Bradesco, Santander, Banco do Brasil, Caixa, Inter), tag da loja vinculada (`st-01` Dom Pedro, `st-02` Jabaquara, etc.), Agência e Conta Corrente formatadas, CPF do operador mascarado (`***.***.789-00`) com toggle de visualização (olho), badge de tipo de acesso (`Acesso Completo` vs `Apenas Consulta`), e status de conexão (`🟢 Conectado`, `🟡 Pendente iToken`, `🔴 Erro de Login`, `⚪ Não Testado`).
   - Modal de Cadastro/Edição `BankBotCredentialModal.tsx` com selects dinâmicos, máscaras de agência/conta/CPF, toggle de visibilidade de senha e chave de ativação para robôs.
   - Ações atômicas por card: `[Testar Conexão / Rodar Bot]`, `[Editar]` e `[Excluir]`.
3. **Consumo pelo Robô Playwright**:
   - Criação de helper no uploader (`bot/src/sync/supabaseUploader.ts`) para consulta direta das credenciais da filial com descriptografia da senha, permitindo ao robô executar o preenchimento automático no portal bancário e reportar status (incluindo espera de iToken).

---

## Investigação e Análise de Reuso (Inspeção do Código Legado)
- **Tabelas / Schemas Existentes**:
  - `stores`: Tabela canônica de lojas. **Ponto Crítico Identificado:** A coluna `id` em `stores` é do tipo `TEXT` (ex: `'st-01'`, `'st-06'`), e não UUID. A nova tabela `bank_bot_credentials` DEVE usar `store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE` para evitar erro de inconsistência de tipos SQL.
  - `profiles`: Utilizada em `useUserPermissions.ts` com a coluna `role` (`admin`, `operador`, `visualizador`). As políticas de RLS devem se basear diretamente nessa verificação.
  - `bot_runs`: Tabela existente que registra execuções de robôs (`useBotRuns.ts`), podendo registrar os testes disparados pelo painel.
- **Componentes / Hooks Existentes Reutilizados**:
  - `useStores()` em `src/hooks/useStores.ts`: Utilizado para popular o select de lojas no modal e exibir os nomes oficiais das filiais nos cards.
  - `useUserPermissions()` em `src/hooks/useUserPermissions.ts`: Utilizado para garantir que apenas administradores tenham permissão de alterar credenciais sensíveis.
  - `ConfiguracoesPanel.tsx` em `src/components/agente/ConfiguracoesPanel.tsx`: Painel central da rota `/configuracoes` que receberá o novo módulo na aba `motor`.
  - Componentes primitivos do design system (`Button`, `Card`, `Badge`, `LoadingSpinner`) com paleta Zinc-950/Emerald-500.

---

## Contratos de Dados & SQL (Supabase)

### Migration: `supabase/migrations/20260908000037_bank_bot_credentials.sql`

```sql
CREATE TABLE IF NOT EXISTS public.bank_bot_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    bank_code VARCHAR(20) NOT NULL, -- 'itau', 'bradesco', 'santander', 'bb', 'caixa', 'inter'
    bank_name VARCHAR(50) NOT NULL, -- 'Itaú Empresas PJ', 'Bradesco PJ', etc.
    agency VARCHAR(10) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    operator_cpf VARCHAR(20) NOT NULL,
    encrypted_password TEXT NOT NULL,
    access_type VARCHAR(20) DEFAULT 'full', -- 'full', 'read_only'
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    last_status VARCHAR(50) DEFAULT 'untested', -- 'untested', 'success', 'waiting_itoken', 'failed'
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_bank_bot_credentials UNIQUE(store_id, bank_code, account_number)
);

-- Índices de consulta
CREATE INDEX IF NOT EXISTS idx_bank_bot_credentials_store ON public.bank_bot_credentials(store_id);
CREATE INDEX IF NOT EXISTS idx_bank_bot_credentials_bank ON public.bank_bot_credentials(bank_code);
CREATE INDEX IF NOT EXISTS idx_bank_bot_credentials_status ON public.bank_bot_credentials(last_status);

-- RLS
ALTER TABLE public.bank_bot_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage bank_bot_credentials" ON public.bank_bot_credentials;
CREATE POLICY "Admins can manage bank_bot_credentials"
ON public.bank_bot_credentials
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

---

## API & Componentes (Frontend)

### Novos Arquivos [NEW]
1. `src/lib/credentialCrypto.ts`: Utilitário com algoritmo AES-GCM / Web Crypto para criptografia e decriptografia simétrica com chave de aplicação, além de mascaradores e validadores de CPF, agência e conta.
2. `src/hooks/useBankBotCredentials.ts`: Hook React Query com query para listar credenciais e mutations para criar, atualizar, excluir e testar conexão com o robô.
3. `src/components/configuracoes/BankBotCredentialsPanel.tsx`: Componente principal da seção de credenciais bancárias dos robôs (Cards com status visual, badges de banco, filtros e ações).
4. `src/components/configuracoes/BankBotCredentialModal.tsx`: Modal para cadastro e edição de credenciais com formulário reativo e validação.

### Arquivos Modificados [MODIFY]
1. `src/components/agente/ConfiguracoesPanel.tsx`: Integração do `BankBotCredentialsPanel` dentro da aba `motor` ("Motor & Lojas").
2. `bot/src/sync/supabaseUploader.ts`: Adição de `getBankBotCredentials(storeId, bankCode)` para consumo autônomo pelo Playwright.

---

## Risco Principal e Mitigação
- **Risco Principal**: Vazamento ou exposição de senhas bancárias em logs de requisição do frontend ou no banco de dados.
- **Mitigação**: 
  1. A senha é cifrada antes da gravação no banco via `encryptBankPassword()`.
  2. No formulário de edição, a senha nunca é trafegada de volta em texto claro (o input permanece vazio com placeholder "•••••••• (não alterada)" caso o usuário queira apenas alterar agência/conta sem reescrever a senha).
  3. O CPF é exibido mascarado por padrão (`***.***.789-00`), só se tornando visível mediante clique intencional no botão de olho.
  4. RLS estrita restringe o acesso aos usuários com `role = 'admin'`.
