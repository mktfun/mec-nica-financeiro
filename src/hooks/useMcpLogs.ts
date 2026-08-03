import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface McpLog {
  id: string;
  conversation_id: string;
  action: string;
  params: any;
  result: any;
  created_at: string;
}

export function useMcpLogs(limit: number = 50) {
  return useQuery({
    queryKey: ['mcp-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mcp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching MCP logs:', error);
        throw error;
      }

      return data as McpLog[];
    },
    refetchInterval: 5000, // Polling a cada 5 segundos para telemetria em tempo real
  });
}
