# 📋 OWASP Top 10 (2021) — Audit & Remediation Checklist

Checklist sistemático para auditoria de segurança em aplicações web e SaaS, cobrindo as 10 categorias oficiais do OWASP Top 10 com padrões defensivos Before/After.

---

## A01:2021 — Broken Access Control (Quebra de Controle de Acesso)

### O que Auditar:
- Verifique se mutações e consultas validam a posse do registro pelo usuário autenticado (`user_id`).
- Identifique vulnerabilidades de IDOR (Insecure Direct Object Reference) em rotas como `/api/invoices/:id`.

### Exemplo Defensivo:
```typescript
// ❌ VULNERÁVEL (IDOR: qualquer usuário autenticado lê a fatura de qualquer outro)
export async function getInvoice(invoiceId: string) {
  const user = await requireAuth()
  return db.from('invoices').select('*').eq('id', invoiceId).single()
}

// ✅ SEGURO (Autorização no banco: valida posse explícita)
export async function getInvoice(invoiceId: string) {
  const user = await requireAuth()
  return db.from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .single()
}
```

---

## A02:2021 — Cryptographic Failures (Falhas Criptográficas)

### O que Auditar:
- Dados sensíveis armazenados em texto claro (senhas, chaves de API, PII).
- Uso de algoritmos de hash fracos (MD5, SHA-1) ou geradores de números aleatórios previsíveis (`Math.random()`).

### Exemplo Defensivo:
```typescript
// ❌ VULNERÁVEL (Previsível para tokens de reset de senha)
const resetToken = Math.random().toString(36).substring(2)

// ✅ SEGURO (Criptograficamente seguro com entropia alta)
import crypto from 'node:crypto'
const resetToken = crypto.randomBytes(32).toString('hex')
```

---

## A03:2021 — Injection (Injeção de Código / SQL / Comandos)

### O que Auditar:
- Concatenação de strings em consultas SQL ou comandos de sistema operacional.
- Inserção de dados não sanitizados no DOM (`dangerouslySetInnerHTML`).

### Exemplo Defensivo:
```typescript
// ❌ VULNERÁVEL (SQL Injection via interpolação de string)
const query = `SELECT * FROM users WHERE email = '${email}'`
const result = await db.query(query)

// ✅ SEGURO (Prepared statements parametrizados)
const result = await db.query('SELECT * FROM users WHERE email = $1', [email])
```

---

## A04:2021 — Insecure Design (Design Inseguro)

### O que Auditar:
- Ausência de rate limiting em endpoints sensíveis (login, recuperação de senha, geração de IA).
- Falta de limites operacionais que permitam exaustão financeira ou DoS de recursos.

### Exemplo Defensivo:
- Implementar rate limiting com Upstash Redis ou Cloudflare Turnstile antes de acionar rotas sensíveis de autenticação ou mutação pesada.

---

## A05:2021 — Security Misconfiguration (Configuração Incorreta de Segurança)

### O que Auditar:
- Modos de debug ativos em produção (`DEBUG=true`, exibição de stack traces com variáveis de ambiente).
- Políticas CORS abertas com credenciais habilitadas (`Access-Control-Allow-Origin: *`).
- Headers de segurança ausentes (HSTS, CSP, X-Content-Type-Options, X-Frame-Options).

---

## A06:2021 — Vulnerable and Outdated Components (Componentes Desatualizados)

### O que Auditar:
- Dependências com CVEs públicas conhecidas. Delegar a varredura para `dependency-scanner.md`.
- Uso de pacotes abandonados ou com unpinned ranges perigosos (`*` ou `latest`).

---

## A07:2021 — Identification and Authentication Failures (Falhas de Identificação e Autenticação)

### O que Auditar:
- Tokens de sessão armazenados no `localStorage` em vez de cookies HTTP-only Secure.
- Uso de `getSession()` no servidor em vez de `getUser()` para validação criptográfica.
- Ausência de bloqueio ou atraso após múltiplas tentativas incorretas de senha.

---

## A08:2021 — Software and Data Integrity Failures (Falhas de Integridade de Software e Dados)

### O que Auditar:
- Deserialização de objetos não-confiáveis (`eval()`, `pickle.loads()`).
- Scripts de terceiros carregados via CDN externa sem hash de integridade de sub-recurso (SRI).

---

## A09:2021 — Security Logging and Monitoring Failures (Falhas de Log e Monitoramento)

### O que Auditar:
- Falha ao registrar tentativas de invasão, falhas repetidas de login ou acessos não-autorizados.
- Vazamento de senhas, chaves de API ou dados de cartão de crédito nos arquivos de log.

---

## A10:2021 — Server-Side Request Forgery (SSRF)

### O que Auditar:
- Requisições HTTP disparadas pelo backend para URLs fornecidas diretamente por usuários sem validação de endereço IP.

### Exemplo Defensivo:
```typescript
// ❌ VULNERÁVEL (Atacante passa http://169.254.169.254/latest/meta-data para ler credenciais AWS)
export async function fetchWebhook(url: string) {
  return fetch(url)
}

// ✅ SEGURO (Validação de hostname e bloqueio de IPs privados e metadados)
import { isIP } from 'node:net'

export async function fetchWebhook(urlString: string) {
  const parsed = new URL(urlString)
  if (['localhost', '127.0.0.1', '169.254.169.254'].includes(parsed.hostname)) {
    throw new Error('Destino proibido por política de segurança')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Protocolo inválido')
  }
  return fetch(parsed.toString())
}
```
