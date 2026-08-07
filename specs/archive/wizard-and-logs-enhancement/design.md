# Design: Melhoria do Wizard de ImportaçÁo, Preview e Logs de GravaçÁo em Tempo Real (wizard-and-logs-enhancement)

## Arquitetura Técnica do Novo Fluxo de 4 Passos

```
[Step 1: Upload / Dropzone com Filtro por Modo]
       │
       ▼
[Step 2: Mapeamento Inteligente de Lojas com Auto-Match & Badges por Origem]
       │
       ▼
[Step 3: Preview Consolidado por Loja (OS vs Maquininha vs Banco OFX)]
       │
       ▼ (Clique em "Confirmar e Gravar ImportaçÁo")
[Step 4: Terminal de Logs de Processamento em Tempo Real]
       ├─► Log 1: GravaçÁo de OSs no Pátio
       ├─► Log 2: GravaçÁo dos Recebíveis da Rede
       ├─► Log 3: GravaçÁo do Extrato Bancário OFX
       ├─► Log 4: GeraçÁo de Matches de ConciliaçÁo
       └─► ConclusÁo (Sucesso)
             ├─► BotÁo 1: "Ir para a Tela de ConciliaçÁo" (navega para /conciliacao)
             └─► BotÁo 2: "Ver Histórico de Importações" (fecha wizard)
```

## Componentes & Interfaces TypeScript

### Estado Interno do Log no Wizard
```typescript
export interface ImportLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
```

## Fluxo de UI & EstilizaçÁo
- **Terminal de Logs (Step 4):**
  - Container estilo console dark (`bg-[#050711] border border-[var(--border-subtle)] rounded-xl p-4 font-mono text-xs overflow-y-auto max-h-72`).
  - Indicador visual de progresso neon com spinners pulsantes.
  - Texto verde para sucesso (`text-emerald-400`), azul para informaçÁo (`text-sky-400`), amarelo para alertas (`text-amber-400`).
- **Cards de Métricas do Step 3 (Preview):**
  - Totais em R$ com `AnimatedNumber`.
  - Badges de contagem e detalhamento de valores líquidos.

## Cenários de VerificaçÁo

### Cenário 1: Fluxo de ImportaçÁo com Step 4 (Logs)
- **Entrada:** Usuário faz upload de arquivos no Step 1, revisa o mapeamento no Step 2, confere o preview no Step 3 e clica em "Confirmar e Gravar ImportaçÁo".
- **Resultado Esperado:** O wizard muda imediatamente para o Step 4, exibe as mensagens de log aparecendo em tempo real (Terminal UI) enquanto as requisições ao Supabase sÁo finalizadas, exibe a badge "GravaçÁo Concluída" e ativa o botÁo "Ir para a Tela de ConciliaçÁo".

### Cenário 2: Redirecionamento para a ConciliaçÁo
- **Entrada:** Usuário clica no botÁo "Ir para a Tela de ConciliaçÁo" ao término do Step 4.
- **Resultado Esperado:** O aplicativo navega diretamente para `/conciliacao` exibindo os dados recém-importados para reconciliaçÁo imediata.
