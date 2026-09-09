# 🔍 Sentry Taint Analysis & Static Code Review Guide

Padrão de análise de fluxo de dados (Taint Analysis) estática e revisão de segurança de código adaptado do ecossistema **Sentry** (`getsentry/skills@security-review`).

---

## 1. Princípios Fundamentais de Taint Analysis

Diferente de linters comuns que usam regex superficial gerando fadiga de alertas (*alert fatigue*), a metodologia da Sentry foca em **rastrear o caminho real do dado não-confiável**:

```
[Attacker-Controlled Source]  ──►  [Transformações / Middleware]  ──►  [Dangerous Sink]
 (request.body, query, headers)          (validação / sanitização?)             (SQL, Shell, DOM, File I/O)
```

### Fontes vs. Valores de Servidor
1. **Attacker-Controlled Input (Entrada do Atacante):**
   - Parâmetros de URL (`request.query`, `searchParams`).
   - Corpo de requisições (`request.json()`, `formData()`, `req.body`).
   - Headers HTTP (`Authorization`, `Origin`, `Referer`, headers customizados).
   - Cookies e webhooks externos não autenticados.
2. **Server-Controlled Values (Valores do Servidor):**
   - Variáveis de ambiente de infraestrutura (`process.env.DATABASE_URL`).
   - Sessão criptografada e autenticada validada por `getUser()`.
   - Constantes estáticas e enums internos.
   - **Regra:** Se o sink sensível consome apenas valores controlados pelo servidor, **NÃO emitir alerta falso positivo**.

---

## 2. As 14 Categorias Críticas de Vulnerabilidade

| Categoria | Fontes & Gatilhos | Sinks Perigosos | Remediação Padrão |
|---|---|---|---|
| **1. SQL & Query Injection** | Input em queries brutas | `$queryRaw`, `db.execute(f"...")`, `.raw()` | Parametrização obrigatória com prepared statements. |
| **2. Command / OS Injection** | Nomes de arquivos, comandos CLI | `exec()`, `spawn(..., { shell: true })`, `os.system()` | Usar `execFile` com array de argumentos, sem subshell. |
| **3. Cross-Site Scripting (XSS)**| HTML ou Markdown fornecido pelo usuário | `dangerouslySetInnerHTML`, `innerHTML`, `mark_safe()` | Sanitização com DOMPurify / sanitize-html ou escaping nativo. |
| **4. Broken Access Control / IDOR**| `id`, `slug`, `uuid` em parâmetros de URL | Consultas `.eq('id', param)` sem `user_id` | Adicionar filtro de propriedade: `.eq('user_id', user.id)`. |
| **5. Auth & Session Flaws** | Cookies, cabeçalhos de autenticação | `getSession()` no servidor, JWT sem validação de revogação | Usar `getUser()` criptográfico e cookies HTTP-only Secure. |
| **6. SSRF** | URLs fornecidas pelo usuário em webhooks/import | `fetch(userUrl)`, `axios.get(userUrl)` | Bloquear faixas privadas RFC 1918 (`127.0.0.1`, `169.254.169.254`). |
| **7. Insecure Cryptography** | Geração de tokens de reset, senhas | `Math.random()`, MD5, SHA1 para senhas | Usar `crypto.randomBytes()` ou `crypto.getRandomValues()`. |
| **8. Insecure Deserialization**| Payloads serializados do cliente | `eval()`, `pickle.loads()`, `yaml.load()` sem SafeLoader | Usar parsers estritos como `JSON.parse()` com validação Zod. |
| **9. CSRF** | Endpoints de mutação (POST/PUT/DELETE) | Cookies de sessão sem proteção SameSite | Impor `SameSite=Lax` ou `SameSite=Strict` e tokens anti-CSRF. |
| **10. Security Misconfiguration**| Configurações de framework | `DEBUG = True`, `Access-Control-Allow-Origin: *` com credenciais | Whitelist de origens estrita e desativar stack traces em prod. |
| **11. Path Traversal** | Nomes de arquivos em uploads ou downloads | `fs.readFile(path.join(dir, userInput))` | Usar `path.basename()` e validar que caminho resolvido está na raiz. |
| **12. XXE (XML External Entity)**| Arquivos XML/OFX importados | Parsers XML legados com external entities | Desativar `resolveExternals` e `loadDTD` em parsers XML. |
| **13. Secret & PII Leakage** | Logs do sistema, respostas de erro | `console.log(error)`, `res.json({ error: err.stack })` | Sanitizar dados de PII/senhas em logs e ofuscar erros para o cliente. |
| **14. Container & Infra Security**| Dockerfiles, manifests, CI/CD | `USER root`, pods privilegiados, `pull_request_target` inseguro | Executar como usuário não-root e restringir permissões de CI. |

---

## 3. Matriz de Confiança (Confidence Scoring)

Ao analisar cada achado, classifique o nível de confiança para evitar alarmes falsos:

* **HIGH Confidence (Reportar Imediatamente):**
  - O fluxo da entrada do atacante até o sink sensível está 100% visível no código, sem validação intermediária.
* **MEDIUM Confidence (Apresentar com Ressalvas):**
  - O dado parece não sanitizado, mas o contexto depende de validação em middleware ou hook externo não analisado.
* **LOW Confidence (Suprimir / Hardening Note):**
  - O framework já possui proteção nativa ativa (ex.: templates JSX/React que fazem auto-escaping automático).

---

## 4. Regra de Redação de Segredos em Evidências

> [!CAUTION]
> **NUNCA imprima segredos ou tokens reais nos relatórios de evidência.**
> Substitua valores reais por strings mascaradas: `ghp_************************************` ou `[REDACTED]`.
