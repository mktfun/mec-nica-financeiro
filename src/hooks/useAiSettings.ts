import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface AiSettings {
  id?: string;
  provider: string;
  model: string;
  api_key?: string; // We might not receive it completely if we mask it, but let's assume we can set it
}

export function useAiSettings() {
  return useQuery({
    queryKey: ['ai_settings'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('ai_settings')
        .select('provider, model, api_key')
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Default values if no settings found
      return data || { provider: 'google', model: 'gemini-2.0-flash', api_key: '' };
    },
  });
}

export function useSaveAiSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: AiSettings) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('ai_settings')
        .upsert({ 
          user_id: user.user.id,
          provider: settings.provider,
          model: settings.model,
          api_key: settings.api_key || null // send null if empty to not overwrite unnecessarily if we handle it
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
