# 🔑 Secrets Detection & Git History Forensics

Padrões de detecção de segredos vazados, chaves de API, credenciais em arquivos e **varredura forense do histórico do Git**, adaptado de `briiirussell/cybersecurity-skills@secrets-audit`.

---

## 1. A Regra do Histórico do Git

> [!CAUTION]
> **Adicionar um arquivo `.env` ao `.gitignore` APÓS tê-lo commitado NÃO apaga o segredo.**
> O arquivo permanece intacto nos commits anteriores, na árvore do Git e no reflog. Qualquer pessoa com acesso ao repositório pode inspecionar o histórico e extrair a chave.
> Toda auditoria de segredos DEVE inspecionar tanto os arquivos atuais quanto os diffs do histórico:
> ```bash
> git log -p -n 30
> ```

---

## 2. Padrões de Regex de Alta Entropia (Gitleaks / TruffleHog)

| Serviço / Provedor | Padrão / Prefixo de Chave | Risco em Caso de Vazamento |
|---|---|---|
| **Supabase Service Role** | `eyJhbGciOi...` com claim `service_role` | Bypass total de RLS e acesso irrestrito ao banco. |
| **OpenAI API Key** | `sk-[a-zA-Z0-9]{48}` ou `sk-proj-[a-zA-Z0-9_-]+` | Drenagem de créditos da conta e acesso a dados. |
| **Stripe Secret Key** | `sk_live_[0-9a-zA-Z]{24}` | Movimentação financeira, estornos e leitura de clientes. |
| **Stripe Webhook Secret** | `whsec_[0-9a-zA-Z]{32}` | Forjamento de eventos de pagamento confirmado. |
| **GitHub Personal Token** | `ghp_[0-9a-zA-Z]{36}` ou `github_pat_...` | Modificação de código e exfiltração de repositórios. |
| **AWS Access Key** | `AKIA[0-9A-Z]{16}` | Controle total da infraestrutura de nuvem. |
| **Chaves Privadas** | `-----BEGIN (RSA\|OPENSSH\|PRIVATE) KEY-----` | Acesso SSH a servidores de produção. |
| **Database Connection Strings** | `postgres://user:pass@host:5432/db` | Conexão direta de superusuário ao PostgreSQL. |

---

## 3. Protocolo de Resposta a Incidentes (Triage em 3 Etapas)

Se um segredo real for detectado em arquivos commitados ou no histórico:

1. **Etapa 1: Revogação e Rotação Imediata (Prioridade Máxima)**:
   - Assuma que o segredo foi comprometido no instante em que foi commitado.
   - Acesse o painel do provedor (Supabase, Stripe, OpenAI) e revogue a chave imediatamente, gerando uma nova.
   - **NÃO apenas delete a linha no código** — a chave antiga precisa ser invalidada no provedor.
2. **Etapa 2: Higienização do Histórico do Git**:
   - Utilize ferramentas especializadas como `git-filter-repo` para expurgar o arquivo ou a string do histórico completo do repositório:
     ```bash
     git filter-repo --replace-text <(echo 'token_vazado==>REDACTED')
     ```
   - Forçar o push atualizado (`git push --force --all`) e alertar a equipe para clonar novamente o repositório.
3. **Etapa 3: Prevenção**:
   - Garantir que `.env*` (exceto `.env.example`) esteja no `.gitignore`.
   - Injetar segredos exclusivamente via variáveis de ambiente da plataforma de deploy (Vercel, Railway, Supabase Secrets, Docker env).
