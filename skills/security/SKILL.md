---
name: security
description: Hub central de Cybersecurity e AppSec — revisão de código (Sentry), pentest adversarial (Cloudflare), OWASP Top 10, dependências (CVEs) e detecção de segredos (Gitleaks).
triggers: [/security-review, /security-audit, /owasp-audit, /dependency-audit, /secrets-audit, security, cve, secrets, owasp, pentest]
---

# 🛡️ Cybersecurity & Application Security Hub

Hub operacional de segurança de aplicações para o ecossistema Antigravity. Consolida as 5 camadas defensivas de AppSec (Sentry, Cloudflare, OWASP Top 10, SCA de Dependências e Varredura Forense de Segredos).

---

## 1. Regra Fundamental: Raciocínio Profundo Obrigatório

> [!WARNING]
> **Toda auditoria de segurança requer esforço cognitivo máximo (`/effort high` / Extended Thinking).**
> Modelos em modo rápido executam apenas buscas superficiais por palavras-chave e ignoram falhas graves de arquitetura multi-hop, como IDOR em chamadas aninhadas, SSRF encadeado ou vulnerabilidades em fluxos de autenticação assíncronos.

---

## 2. Os 5 Sub-Workflows de Segurança

O hub provê 5 comandos especializados executáveis pelo agente ou pelo usuário:

### `/security-review` (Padrão Sentry)
* **Objetivo**: Revisão estática de segurança do código-fonte e diffs de PR.
* **Metodologia**: Taint Analysis (rastreamento de dados de entradas controladas por atacantes até sinks sensíveis). Supressão de falsos positivos mitigados por frameworks.
* **Referência**: `references/sentry-taint-analysis.md`.

### `/security-audit` (Padrão Cloudflare Pentest)
* **Objetivo**: Auditoria adversarial profunda com simulação de invasão contra a aplicação.
* **Metodologia**: Pipeline em 6 fases (Reconnaissance, Hunting, Adversarial Validation, Reporting, Schema Validation, Independent Verification).
* **Princípio**: *"Only report what you can exploit"* com demonstração de impacto real.
* **Referência**: `references/cloudflare-adversarial.md`.

### `/owasp-audit` (Conformidade OWASP Top 10)
* **Objetivo**: Auditoria sistemática baseada no padrão OWASP Top 10 (2021).
* **Foco**: Broken Access Control (IDOR), Injeção, Falhas Criptográficas, SSRF, Misconfiguration.
* **Referência**: `references/owasp-top-10.md`.

### `/dependency-audit` (CVEs & Supply Chain)
* **Objetivo**: Varredura de vulnerabilidades conhecidas em pacotes de terceiros.
* **Metodologia**: Inspeção de lockfiles (`package-lock.json`, `pnpm-lock.yaml`) e cruzamento com bases de CVE (NVD, OSV, GHSA).
* **Referência**: `references/dependency-scanner.md`.

### `/secrets-audit` (Segredos no Código e Histórico)
* **Objetivo**: Detecção de credenciais, chaves de API, Service Roles e tokens.
* **Metodologia**: Varredura de arquivos locais e do **histórico completo do Git** (`git log -p -n 30`).
* **Referência**: `references/secrets-patterns.md`.

---

## 3. Cadência de Auditoria: Lembrete Periódico (A cada 5 a 10 Ciclos)

A cada **5 a 10 ciclos concluídos de `sdd-apply` ou `sdd-archive`**, o sistema DEVE emitir proativamente no terminal um banner de destaque alertando para a saúde de segurança da aplicação:

```text
================================================================================
 🛡️ [SECURITY HEALTH CHECK REMINDER]
 Foram realizados múltiplos ciclos de alteração de código neste projeto.
 É fortemente recomendado rodar uma varredura preventiva de segurança:
   👉 /secrets-audit     -> Verificar se nenhuma chave vazou nos commits
   👉 /dependency-audit  -> Checar CVEs em pacotes recém-adicionados
   👉 /security-review   -> Auditar autorização (AuthZ/IDOR) e sanitização
================================================================================
```

---

## 4. Portões de Bloqueio Rígido no Ciclo de Vida

1. **Pre-Commit Secrets Blocker (`sdd-apply` / `sdd-archive`)**:
   - É **TERMINANTEMENTE PROIBIDO** avançar para o archive ou commitar código se qualquer segredo real (OpenAI `sk-`, Stripe `sk_live_`, Supabase `service_role`, AWS keys) for detectado no código ou em arquivos de staged.
   - O agente deve interromper o turno e exigir a sanitização imediata.
2. **Threat Modeling no Planejamento (`sdd-proposal`)**:
   - Todo `design.md` deve conter uma seção explicitando a matriz de autorização e garantindo que requisições ao banco filtram por `user_id` do usuário autenticado.
