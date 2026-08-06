export type LogLevel = 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
export type LogStage = '1_UPLOAD' | '2_EXTRACTION_OFX' | '3_EXTRACTION_EXCEL' | '4_NORMALIZATION' | '5_MATCHING_ENGINE' | '6_STAGING_READY';

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
    console.error(`[TRACE:${stage}]`, jsonLog);
  } else if (level === 'WARN') {
    console.warn(`[TRACE:${stage}]`, jsonLog);
  } else if (level === 'DEBUG') {
    console.debug(`[TRACE:${stage}]`, jsonLog);
  } else {
    console.info(`[TRACE:${stage}]`, jsonLog);
  }
}

// Utilitário para gerar session_id único
export const generateSessionId = () => `imp_${Math.random().toString(36).substring(2, 10)}`;
