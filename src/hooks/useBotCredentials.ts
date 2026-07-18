import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type BotCredentialRow = {
  id: string;
  portal: 'oficina_inteligente' | 'rede';
  portal_label: string;
  url: string;
  username: string;
  password: string;
  last_validated_at: string | null;
  is_valid: boolean;
  validation_error: string | null;
  updated_at: string;
};

export function useBotCredentials() {
  return useQuery({
    queryKey: ['bot_credentials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_credentials')
        .select('*')
        .order('portal');
      if (error) {
        console.warn('Failed to fetch bot credentials:', error);
        return [] as BotCredentialRow[];
      }
      return data as BotCredentialRow[];
    },
  });
}

export function useUpdateBotCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      portal,
      username,
      password,
    }: {
      portal: string;
      username: string;
      password: string;
    }) => {
      const { error } = await supabase
        .from('bot_credentials')
        .update({
          username,
          password,
          is_valid: false,
          last_validated_at: null,
          validation_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('portal', portal);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bot_credentials'] });
    },
  });
}

export function useMarkCredentialValid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      portal,
      isValid,
      error,
    }: {
      portal: string;
      isValid: boolean;
      error?: string;
    }) => {
      const { error: dbError } = await supabase
        .from('bot_credentials')
        .update({
          is_valid: isValid,
          last_validated_at: new Date().toISOString(),
          validation_error: error || null,
        })
        .eq('portal', portal);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bot_credentials'] });
    },
  });
}
