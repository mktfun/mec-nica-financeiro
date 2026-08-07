import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface AiSettings {
  id?: string;
  provider: string;
  model: string;
  api_key?: string;
  bot_url?: string;
  bot_api_key?: string;
}

export function useAiSettings() {
  return useQuery({
    queryKey: ['ai_settings'],
    queryFn: async () => {
      const defaultKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || (import.meta.env.VITE_AI_API_KEY as string) || '';

      try {
        const { data: user } = await supabase.auth.getUser();
        const userId = user?.user?.id;

        // Tenta buscar pelo id do usuário se logado
        if (userId) {
          const { data, error } = await supabase
            .from('ai_settings')
            .select('provider, model, api_key, bot_url, bot_api_key')
            .eq('user_id', userId)
            .maybeSingle();

          if (!error && data) {
            return {
              provider: data.provider || 'google',
              model: data.model || 'gemini-2.0-flash',
              api_key: data.api_key || defaultKey,
              bot_url: data.bot_url || 'https://bot.tork.services',
              bot_api_key: data.bot_api_key || '',
            };
          }
        }

        // Tenta buscar pela configuração GLOBAL
        const { data: globalData, error: globalErr } = await supabase
          .from('ai_settings')
          .select('provider, model, api_key, bot_url, bot_api_key')
          .eq('user_id', 'GLOBAL')
          .maybeSingle();

        if (!globalErr && globalData) {
          return {
            provider: globalData.provider || 'google',
            model: globalData.model || 'gemini-2.0-flash',
            api_key: globalData.api_key || defaultKey,
            bot_url: globalData.bot_url || 'https://bot.tork.services',
            bot_api_key: globalData.bot_api_key || '',
          };
        }
      } catch (err) {
        console.warn('Aviso ao carregar ai_settings do Supabase:', err);
      }

      return { provider: 'google', model: 'gemini-2.0-flash', api_key: defaultKey, bot_url: 'https://bot.tork.services', bot_api_key: '' };
    },
  });
}

export function useSaveAiSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: AiSettings) => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id || 'GLOBAL';

      const { error } = await supabase
        .from('ai_settings')
        .upsert({ 
          user_id: userId,
          provider: settings.provider,
          model: settings.model,
          api_key: settings.api_key || null,
          bot_url: settings.bot_url || null,
          bot_api_key: settings.bot_api_key || null,
        }, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_settings'] });
      toast.success('Configurações de IA salvas com sucesso!');
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  });
}
