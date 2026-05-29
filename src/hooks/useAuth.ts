import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useNavigate } from '@tanstack/react-router';
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
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('E-mail ou senha incorretos. Tente novamente.');
      setLoading(false);
      return false;
    }

    navigate({ to: '/' });
    return true;
  };

  return { login, loading, error };
}

// ─── Logout Hook ─────────────────────────────────────────────────────────────

export function useLogout() {
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: '/login' });
  };

  return { logout };
}
