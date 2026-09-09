# ⚔️ Cloudflare Adversarial Security Audit Pipeline

Metodologia de auditoria adversarial e descoberta profunda de vulnerabilidades adaptada do **Cloudflare Security Audit Skill** (`cloudflare/security-audit-skill`).

---

## 1. Princípios Invioláveis da Auditoria Adversarial

1. **"Only Report What You Can Exploit" (Apenas Reporte o que for Explorável):**
   - Não reporte desvios cosméticos de estilo ou sugestões vagas de compliance se não houver um caminho comprovado de ataque de ponta a ponta.
2. **"Adversarial Cross-Examination" (Validação Cruzada Adversarial):**
   - O agente que descobre uma vulnerabilidade NÃO deve ser o mesmo que a valida. Um agente validador separado deve tentar ativamente **refutar** a hipótese para comprovar se o ataque sobrevive às defesas reais.
3. **"Severity Requires Demonstrated Impact" (Severidade Exige Impacto Demonstrado):**
   - Severidade é calculada como $\text{Probabilidade} \times \text{Impacto}$. Pequenas discrepâncias sem dano real a dados ou infraestrutura são apenas notas de endurecimento (*Hardening Notes*).
4. **"Defense-in-Depth Gaps are Not Vulnerabilities":**
   - Se a Camada A (ex.: middleware de autenticação / API Gateway) bloqueia a requisição, a falta de checagem redundante na Camada B é uma sugestão de melhoria, não uma vulnerabilidade crítica.

---

## 2. O Pipeline em 6 Fases

```
[Fase 1: Reconnaissance]  ──► Mapeamento de superfície, limites de confiança e endpoints
          ↓
[Fase 2: Hunting]         ──► Ataque direcionado com mentalidade de invasor (sad path)
          ↓
[Fase 3: Validation]      ──► Tentativa ativa de REFUTAR os achados (anti-falso-positivo)
          ↓
[Fase 4: Reporting]       ──► Relatório executivo (reprodução, evidências, remediação)
          ↓
[Fase 5: Schema Check]    ──► Serialização estruturada em JSON verificado
          ↓
[Fase 6: Verification]   ──► Verificação factual independente (caminhos e linhas reais)
```

---

## 3. Classes de Ataque Especializadas

### A. Controle de Acesso & Multi-Tenancy (BOLA / IDOR)
- Modificação de parâmetros identificadores (`id`, `uuid`, `slug`) para acessar dados de outro inquilino ou usuário.
- Escalação vertical de privilégios (usuário comum invocando endpoints de administrador manipulando payloads).

### B. O Caminho Triste ("The Sad Path")
- **Error Handlers & Fallbacks:** Inspecionar blocos `catch`, middlewares de erro e rotas de timeout.
- Verificar se uma falha em uma etapa intermediária deixa o estado do banco parcialmente corrompido ou sem rollback.

### C. Condições de Limite & Concorrência
- **Testes de Borda:** Valores $N+1$, arrays vazios, inteiros negativos, caracteres Unicode de largura zero.
- **Race Conditions:** Duplo clique em operações de débito/crédito, resgate duplo de cupons ou tokens descartáveis.

### D. Protocolo Web, Headers & CORS
- Testar origens dinâmicas no CORS (`Origin` refletido com `credentials: true`).
- Headers de bypass de IP (`X-Forwarded-For`, `CF-Connecting-IP`) usados indevidamente para autorização ou rate limiting.

### E. AI / LLM Native Vulnerabilities
- **Prompt Injection Direto:** Jailbreaks contornando instruções de sistema.
- **Prompt Injection Indireto:** Dados externos recuperados via RAG (documentos, scraping web) contendo instruções maliciosas para forçar chamadas de ferramentas (*tool calling abuse*).
