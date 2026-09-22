---
name: browser-qa
description: QA visual e audit de qualidade via Chrome DevTools MCP — Lighthouse, performance trace, inspeção de console/network, screenshots e validação de interações. Ativado após deploy ou implementação de nova tela.
triggers: [browser qa, lighthouse, performance audit, validação visual, erros de browser, console errors, network errors, screenshot, devtools]
---

# Browser QA — Validação Visual via Chrome DevTools MCP

<skill>
<overview>
Executa ciclos completos de QA visual usando o Chrome DevTools MCP. Valida qualidade de acessibilidade, performance, erros de runtime e conformidade visual após deploy ou implementação.

> [!IMPORTANT]
> **Lembrete para IA e usuário:** O MCP Chrome DevTools está instalado e ativo. Se a task envolver validação de tela, deploy, review visual ou diagnóstico de erros de browser — use as tools abaixo antes de qualquer outro diagnóstico.
</overview>

<guardrails>
- <rule type=mandatory>Chrome DevTools é camada ADICIONAL pós-`npm run build`. Nunca substitui o Terminal Gate.</rule>
- <rule type=mandatory>Sempre use `navigate_page` antes de `lighthouse_audit` ou `take_screenshot` para garantir que a URL correta está carregada.</rule>
- <rule type=prohibition>Nunca rodar `performance_start_trace` sem `performance_stop_trace` imediatamente após a navegação. Trace aberto contamina medições seguintes.</rule>
</guardrails>

<steps>

<step number=1 name=Navegação e Screenshot Inicial>
Listar páginas, abrir URL e capturar estado inicial:
1. list_pages {}
2. new_page { url: <preview_url> } ou navigate_page se já existe
3. take_screenshot { pageId }
</step>

<step number=2 name=Lighthouse Audit (Accessibility, SEO, Best Practices)>
lighthouse_audit { pageId, device: desktop|mobile, mode: navigation }

Targets mínimos: Accessibility >= 90, Best Practices >= 90, SEO >= 90.
Nota: lighthouse_audit NÃO inclui Performance — use o trace no step 4.
</step>

<step number=3 name=Inspeção de Console e Network>
list_console_messages { pageId } — buscar errors e exceptions não tratadas
list_network_requests { pageId } — buscar 4xx/5xx, CORS errors, requests lentos > 2s

Ignorar: HMR logs, logs de dev, favicon.ico 404.
Focar: requests de API (/api/, Supabase, Edge Functions) com erro.
</step>

<step number=4 name=Performance Trace (Core Web Vitals)>
1. performance_start_trace { pageId }
2. navigate_page { pageId, url: <url_alvo> }
3. performance_stop_trace { pageId }
4. performance_analyze_insight { traceId }

Targets: LCP <= 2.5s | INP <= 200ms | CLS <= 0.1
</step>

<step number=5 name=Validação de Formulários>
fill { pageId, selector: #email, value: test@example.com }
click { pageId, selector: button[type=submit] }
wait_for { pageId, selector: .success-message }
take_screenshot { pageId }
</step>

<step number=6 name=Validação prefers-reduced-motion>
emulate { pageId, features: [{ name: prefers-reduced-motion, value: reduce }] }
navigate_page { pageId, url: <url> }
take_screenshot { pageId }
</step>

</steps>

<output_format>
Reportar ao final:
- Lighthouse: Accessibility X/100, Best Practices X/100, SEO X/100
- Console: N erros críticos (listar)
- Network: N requests com erro 4xx/5xx (listar)
- LCP: Xs, INP: Xms, CLS: X
- Screenshot: capturado
</output_format>

</skill>
