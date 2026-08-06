# Design: Trace Logs Estruturados (101)

## 1. Novo Arquivo: `src/lib/logger.ts`
```typescript
type LogLevel = 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
type LogStage = '1_UPLOAD' | '2_EXTRACTION_OFX' | '3_EXTRACTION_EXCEL' | '4_NORMALIZATION' | '5_MATCHING_ENGINE' | '6_STAGING_READY';

export function traceLog(
  stage: LogStage,
  level: LogLevel,
  message: string,
  sessionId: string,
  data: any
) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    stage,
    session_id: sessionId,
    message,
    data
  };

  const jsonLog = JSON.stringify(log, null, 2);
  
  if (level === 'ERROR') {
    console.error(`[TRACE:${stage}]`, log);
  } else if (level === 'WARN') {
    console.warn(`[TRACE:${stage}]`, log);
  } else if (level === 'DEBUG') {
    console.debug(`[TRACE:${stage}]`, log);
  } else {
    console.info(`[TRACE:${stage}]`, log);
  }
}

// Utilitário para gerar session_id único
export const generateSessionId = () => `imp_${Math.random().toString(36).substring(2, 10)}`;
```

## 2. Injeção de Logs nos Fluxos Principais
- **`WizardImportacao.tsx` / `CentralImportWizard.tsx`**:
  - `onDrop`: Gerar `session_id`, logar `1_UPLOAD` listando `files.map(f => ({ name: f.name, size: f.size }))`.
  - Final do parse: Logar `6_STAGING_READY` com a volumetria das transações preparadas.
- **`ofxParser.ts`**:
  - Receber opcionalmente o `sessionId`. Ao terminar o loop, logar `2_EXTRACTION_OFX`.
- **`redeParser.ts` / Outros Parsers CSV**:
  - Receber opcionalmente o `sessionId`. Ao terminar o loop, logar `3_EXTRACTION_EXCEL`.
