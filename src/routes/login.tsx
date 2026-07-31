import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLogin } from '@/hooks/useAuth';
import { Eye, EyeOff, Zap } from 'lucide-react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { login, loading, error } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      router.navigate({ to: '/' });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-4">
      {/* Background subtle grid */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--color-primary)] mb-4 shadow-lg shadow-[var(--color-primary)]/30">
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">
            Mecânica Popular
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Painel Financeiro · Acesso restrito
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-[var(--radius-xl)] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* E-mail */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ana@mecanicapopular.com.br"
                className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-md)] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-[var(--radius-md)] px-4 py-3 pr-12 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-[var(--radius-md)] bg-[var(--color-accent-danger)]/10 border border-[var(--color-accent-danger)]/30 text-sm text-[var(--color-accent-danger)]"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-bright)] disabled:opacity-60 text-white rounded-[var(--radius-full)] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-tertiary)] mt-6 opacity-50">
          © {new Date().getFullYear()} Mecânica Popular · Todos os direitos reservados
        </p>
      </motion.div>
    </div>
  );
}
