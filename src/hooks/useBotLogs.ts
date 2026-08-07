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

/** Hook para Logs Unificados (system_logs) */
export function useBotLogs(limit = 50) {
  return useQuery({
    queryKey: ['system_logs', 'ai', limit],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_logs')
          .select('*')
          .eq('context', 'ai')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) return [] as BotAuditLog[];
        return (data || []).map((item: any) => ({
          id: item.id,
          bot_name: 'AI Engine',
          status: item.level === 'error' ? 'error' : item.level === 'warning' ? 'warning' : 'success',
          message: item.message,
          payload: item.metadata,
          created_at: item.created_at,
        })) as BotAuditLog[];
      } catch (e) {
        return [] as BotAuditLog[];
      }
    },
  });
}

/** Hook para logs de Auditoria (system_logs context bot) */
export function useBotAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ['system_logs', 'bot', limit],
    queryFn: async (): Promise<BotAuditLog[]> => {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .eq('context', 'bot')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[useBotAuditLogs] Erro:', error.message);
        return [];
      }
      return (data || []).map((item: any) => ({
          id: item.id,
          bot_name: 'Bot',
          status: item.level === 'error' ? 'error' : item.level === 'warning' ? 'warning' : 'success',
          message: item.message,
          payload: item.metadata,
          created_at: item.created_at,
        })) as BotAuditLog[];
    },
    refetchInterval: 30_000,
  });
}
