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

export function useBotLogs(limit = 50) {
  return useQuery({
    queryKey: ['bot_logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        // Ignora erro se a tabela não existir ainda (antes da migration rodar)
        console.warn('Failed to fetch bot logs (table might not exist yet):', error);
        return [] as BotAuditLog[];
      }

      return data as BotAuditLog[];
    },
  });
}
