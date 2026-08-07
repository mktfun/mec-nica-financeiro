# Design - 019 OS History & Layout Spacing

## Banco de Dados (Supabase MCP)
- Criar a migraçÁo `add_history_log_to_patio_os`.
- Adicionar a coluna `history_log` do tipo `jsonb` na tabela `patio_os`, com o default valendo `'[]'::jsonb`.
- Executar a tipagem (`supabase gen types`).

A estrutura do JSON dentro do `history_log` será:
```json
[
  {
    "date": "2026-06-02T10:00:00Z",
    "changes": [
      { "field": "total_value", "from": 100, "to": 150 },
      { "field": "status", "from": "em_aberto", "to": "finalizado" }
    ]
  }
]
```

## Interface e UI (UX 2026)
### Timeline de Histórico (Modal)
- O modal em `src/routes/patio.tsx` ganhará uma timeline minimalista.
- **Estética Liquid Glass & WCAG 2.2**: 
  - Fio vertical unindo os eventos com `border-dashed` e opacidade reduzida.
  - Cards de evento com `bg-white/5`, `backdrop-blur-sm`, bordas sutis e contraste acessível nos valores em dinheiro (ex: verdes e vermelhos harmonizados).
  - Uso de ícones (ex: `ArrowUp` ou `Clock`) da biblioteca `lucide-react` para ilustrar os updates.

### Global Spacing (`AppShell.tsx`)
- Alterar as classes de wrapper interno. No `main`, ajustar `pb-24 md:pb-8` para um valor maior (ex: `pb-32 md:pb-24`) e no contêiner interno garantir margem extra, para que nÁo importe a altura da tela, o conteúdo nÁo fique preso.
