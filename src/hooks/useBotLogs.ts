import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface BotAuditLog {
  id: string;
  bot_name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  payload: any;
  created_at: string;
}

/** Hook para AI execution logs (telemetria do LLM) */
export function useBotLogs(limit = 50) {
  return useQuery({
    queryKey: ['bot_logs', limit],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('ai_execution_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) return [] as BotAuditLog[];
        return (data || []).map((item: any) => ({
          id: item.id,
          bot_name: item.provider ? `${item.provider} (${item.model})` : 'AI Engine',
          status: item.matches_applied_count > 0 ? 'success' : 'warning',
          message: `Execução ${item.execution_time_ms || 0}ms • ${item.matches_applied_count || 0} matches • ${item.total_tokens || 0} tokens`,
          payload: item.raw_payload_json,
          created_at: item.created_at,
        })) as BotAuditLog[];
      } catch (e) {
        return [] as BotAuditLog[];
      }
    },
  });
}

/** Hook para logs do bot Playwright (bot_audit_logs) */
export function useBotAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ['bot_audit_logs', limit],
    queryFn: async (): Promise<BotAuditLog[]> => {
      const { data, error } = await supabase
        .from('bot_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[useBotAuditLogs] Erro:', error.message);
        return [];
      }
      return (data || []) as BotAuditLog[];
    },
    refetchInterval: 30_000, // auto-refresh a cada 30s
  });
}
