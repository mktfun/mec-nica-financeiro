# Design: Melhoria do Wizard de Importação, Preview e Logs de Gravação em Tempo Real (wizard-and-logs-enhancement)

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
       ▼ (Clique em "Confirmar e Gravar Importação")
[Step 4: Terminal de Logs de Processamento em Tempo Real]
       ├─► Log 1: Gravação de OSs no Pátio
       ├─► Log 2: Gravação dos Recebíveis da Rede
       ├─► Log 3: Gravação do Extrato Bancário OFX
       ├─► Log 4: Geração de Matches de Conciliação
       └─► Conclusão (Sucesso)
             ├─► Botão 1: "Ir para a Tela de Conciliação" (navega para /conciliacao)
             └─► Botão 2: "Ver Histórico de Importações" (fecha wizard)
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

## Fluxo de UI & Estilização
- **Terminal de Logs (Step 4):**
  - Container estilo console dark (`bg-[#050711] border border-[var(--border-subtle)] rounded-xl p-4 font-mono text-xs overflow-y-auto max-h-72`).
  - Indicador visual de progresso neon com spinners pulsantes.
  - Texto verde para sucesso (`text-emerald-400`), azul para informação (`text-sky-400`), amarelo para alertas (`text-amber-400`).
- **Cards de Métricas do Step 3 (Preview):**
  - Totais em R$ com `AnimatedNumber`.
  - Badges de contagem e detalhamento de valores líquidos.

## Cenários de Verificação

### Cenário 1: Fluxo de Importação com Step 4 (Logs)
- **Entrada:** Usuário faz upload de arquivos no Step 1, revisa o mapeamento no Step 2, confere o preview no Step 3 e clica em "Confirmar e Gravar Importação".
- **Resultado Esperado:** O wizard muda imediatamente para o Step 4, exibe as mensagens de log aparecendo em tempo real (Terminal UI) enquanto as requisições ao Supabase são finalizadas, exibe a badge "Gravação Concluída" e ativa o botão "Ir para a Tela de Conciliação".

### Cenário 2: Redirecionamento para a Conciliação
- **Entrada:** Usuário clica no botão "Ir para a Tela de Conciliação" ao término do Step 4.
- **Resultado Esperado:** O aplicativo navega diretamente para `/conciliacao` exibindo os dados recém-importados para reconciliação imediata.
