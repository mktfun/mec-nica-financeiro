import { useQuery } from '@tanstack/react-query';
import { supabase, BotRunRow } from '@/lib/supabase';

export function useLatestBotRun() {
  return useQuery({
    queryKey: ['bot_runs', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BotRunRow | null;
    },
    refetchInterval: 30000, // atualiza a cada 30s
  });
}

export function useBotRunHistory(limit = 10) {
  return useQuery({
    queryKey: ['bot_runs', 'history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as BotRunRow[];
    },
  });
}
