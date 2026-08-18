import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSession } from './useAuth';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operador' | 'visualizador';
  can_edit_data: boolean;
  can_import: boolean;
  created_at?: string;
  last_sign_in_at?: string;
}

export function useUserPermissions() {
  const session = useSession();
  const userId = session?.user?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[useUserPermissions] Erro ao buscar perfil:', error);
        return null;
      }

      if (!data) {
        // Fallback default admin se for o primeiro usuário
        return {
          id: userId,
          email: session.user.email || '',
          full_name: session.user.email?.split('@')[0] || 'Usuário',
          role: 'admin',
          can_edit_data: true,
          can_import: true,
        };
      }

      return {
        id: data.id,
        email: data.email || session.user.email || '',
        full_name: data.full_name || session.user.email?.split('@')[0] || 'Usuário',
        role: (data.role as any) || 'operador',
        can_edit_data: data.can_edit_data !== false,
        can_import: data.can_import !== false,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  const isAdmin = profile?.role === 'admin';
  const canEditData = isAdmin || profile?.can_edit_data !== false;
  const canImport = isAdmin || profile?.can_import !== false;

  return {
    user: session?.user || null,
    profile,
    isAdmin,
    canEditData,
    canImport,
    role: profile?.role || 'operador',
    isLoading,
  };
}

export function useSystemUsers() {
  return useQuery({
    queryKey: ['system-users'],
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase.rpc('get_system_users');
      if (error) {
        console.error('[useSystemUsers] Erro ao listar usuários:', error);
        throw error;
      }
      return (data as unknown as UserProfile[]) || [];
    },
    staleTime: 1000 * 30, // 30s
  });
}
