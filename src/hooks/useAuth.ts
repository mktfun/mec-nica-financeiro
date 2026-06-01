import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ─── Session Hook ────────────────────────────────────────────────────────────

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return session;
}

// ─── Login Hook ──────────────────────────────────────────────────────────────

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError('E-mail ou senha incorretos. Tente novamente.');
        return false;
      }

      // Supabase onAuthStateChange vai disparar → AppShell detecta sessão → navega
      return true;
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message || 'Erro de conexão. Tente novamente.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { login, loading, error };
}

// ─── Logout Hook ─────────────────────────────────────────────────────────────

export function useLogout() {
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    // onAuthStateChange dispara → AppShell detecta null → redireciona para /login
  }, []);

  return { logout };
}
