import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AuditLogEntry {
  id: string;
  target_date: string;
  user_id: string | null;
  user_email: string | null;
  action_type: 'importacao' | 'fechamento' | 'edicao_manual' | 'vinculo_os' | 'agente_ia' | 'usuario';
  title: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

export function useAuditLogs(targetDate?: string) {
  return useQuery({
    queryKey: ['audit-logs', targetDate],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (targetDate) {
        query = query.eq('target_date', targetDate);
      } else {
        query = query.limit(50);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[useAuditLogs] Erro ao carregar logs:', error);
        throw error;
      }

      return (data as AuditLogEntry[]) || [];
    },
    staleTime: 1000 * 15, // 15s cache
  });
}

export function useLogAuditEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      target_date: string;
      action_type: 'importacao' | 'fechamento' | 'edicao_manual' | 'vinculo_os' | 'agente_ia' | 'usuario';
      title: string;
      description: string;
      metadata?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('audit_logs').insert({
        target_date: entry.target_date,
        user_id: user?.id || null,
        user_email: user?.email || 'sistema',
        action_type: entry.action_type,
        title: entry.title,
        description: entry.description,
        metadata: entry.metadata || {},
      });

      if (error) {
        console.warn('[useLogAuditEvent] Erro ao gravar log de auditoria:', error);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs', variables.target_date] });
    },
  });
}
