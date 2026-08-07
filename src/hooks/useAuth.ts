import { useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ─── Session Hook ────────────────────────────────────────────────────────────

// Cache global para evitar flickering na mudança de rotas (remontagem do AppShell)
let globalSession: Session | null | undefined = undefined;
let isInitializing = false;
const listeners = new Set<(s: Session | null | undefined) => void>();

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(globalSession);

  useEffect(() => {
    const listener = (s: Session | null | undefined) => setSession(s);
    listeners.add(listener);

    if (globalSession === undefined && !isInitializing) {
      isInitializing = true;
      supabase.auth.getSession().then(({ data }) => {
        globalSession = data.session;
        listeners.forEach(l => l(globalSession));
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        globalSession = session;
        listeners.forEach(l => l(globalSession));
      });
    }

    // Define valor inicial caso a sessão global tenha sido atualizada antes do useEffect
    if (session !== globalSession) {
      setSession(globalSession);
    }

    return () => {
      listeners.delete(listener);
    };
  }, [session]);

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
