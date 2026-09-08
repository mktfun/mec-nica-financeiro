import { useSyncExternalStore, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ─── Session Hook (React Standard: useSyncExternalStore) ─────────────────────

// Cache global para sincronização reativa e sem flickering entre rotas
let globalSession: Session | null | undefined = undefined;
let isInitializing = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((callback) => callback());
}

function subscribe(callback: () => void) {
  listeners.add(callback);

  if (globalSession === undefined && !isInitializing) {
    isInitializing = true;
    supabase.auth.getSession().then(({ data }) => {
      globalSession = data.session;
      notify();
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      globalSession = session;
      notify();
    });
  }

  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): Session | null | undefined {
  return globalSession;
}

function getServerSnapshot(): Session | null | undefined {
  return undefined;
}

export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
