import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAiSettings, useSaveAiSettings } from '@/hooks/useAiSettings';
import { Bot, Cpu, KeyRound, Zap, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const MODEL_OPTIONS = {
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-haiku-20240307', 'claude-opus-4-5'],
};

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google (Gemini)',
  openai: 'OpenAI (GPT)',
  anthropic: 'Anthropic (Claude)',
};

export function AgenteIAConfigPanel() {
  const { data: settings, isLoading } = useAiSettings();
  const saveSettings = useSaveAiSettings();

  const [provider, setProvider] = useState('google');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider || 'google');
      setModel(settings.model || 'gemini-2.0-flash');
      setApiKey(settings.api_key || '');
    }
  }, [settings]);

  const handleSave = () => {
    saveSettings.mutate(
      { provider, model, api_key: apiKey },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          toast.success('Configurações da IA salvas!');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="sm" text="Carregando..." />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto w-full p-4 md:p-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/15 flex items-center justify-center">
            <Bot size={20} className="text-[var(--color-primary)]" />
          </div>
          Configurações da IA
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Defina o provedor, modelo e a API Key usados pelo Agente Oficina GPT.
        </p>
      </div>

      <Card variant="glass" className="p-6 space-y-6">

        {/* Provedor */}
        <div>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
            <Cpu size={12} />
            Provedor LLM
          </label>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(MODEL_OPTIONS).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setProvider(p);
                  setModel(MODEL_OPTIONS[p as keyof typeof MODEL_OPTIONS][0]);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                  provider === p
                    ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]/50 text-[var(--color-primary)]'
                    : 'bg-black/20 border-white/10 text-[var(--text-secondary)] hover:border-white/20'
                }`}
              >
                {PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Modelo */}
        <div>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
            <Zap size={12} />
            Modelo
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors"
          >
            {MODEL_OPTIONS[provider as keyof typeof MODEL_OPTIONS]?.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
            <KeyRound size={12} />
            API Key
          </label>
          <input
            type="password"
            autoComplete="new-password"
            data-lpignore="true"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-... ou AIza..."
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors font-mono"
          />
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
            Sua chave é armazenada com segurança e usada exclusivamente pela Edge Function de IA.
          </p>
        </div>

        {/* Salvar */}
        <div className="pt-2 flex items-center gap-3">
          <Button onClick={handleSave} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400 animate-in fade-in duration-300">
              <CheckCircle2 size={14} />
              Salvo com sucesso!
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
