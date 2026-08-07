import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBotRunHistory } from '@/hooks/useBotRuns';
import { useStores, useDeleteStore } from '@/hooks/useStores';
import { StoreFormDialog } from '@/components/dashboard/StoreFormDialog';
import { useState, useEffect } from 'react';
import { StoreRow } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useBotCredentials, useUpdateBotCredential } from '@/hooks/useBotCredentials';
import { useBotLogs } from '@/hooks/useBotLogs';
import { Bot, Eye, EyeOff, CheckCircle2, XCircle, Clock, ExternalLink, Terminal, AlertTriangle, Workflow } from 'lucide-react';
import { useAiSettings, useSaveAiSettings } from '@/hooks/useAiSettings';

export function ConfiguracoesPanel() {
  const { data: botRuns = [], isLoading: loadingBots } = useBotRunHistory();
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: botCreds = [], isLoading: loadingCreds } = useBotCredentials();
  const { data: botLogs = [], isLoading: loadingLogs } = useBotLogs(20);
  const updateCred = useUpdateBotCredential();
  const deleteStore = useDeleteStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState<StoreRow | undefined>();
  // credEdit: { [portal]: { username, password, showPw } }
  const [credEdit, setCredEdit] = useState<Record<string, { username: string; password: string; showPw: boolean }>>({});
  const [savingCred, setSavingCred] = useState<string | null>(null);
  const [savedCred, setSavedCred] = useState<string | null>(null);

  const handleEditStore = (store: StoreRow) => {
    setStoreToEdit(store);
    setIsFormOpen(true);
  };

  const handleDeleteStore = async (store: StoreRow) => {
    if (confirm(`Tem certeza que deseja excluir a loja ${store.name}?`)) {
      await deleteStore.mutateAsync(store.id);
    }
  };

  const lastRun = botRuns[0];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto w-full p-4 md:p-8">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">Configurações</h1>
        <p className="text-[var(--text-secondary)] text-sm">Gerencie o comportamento do motor de conciliação autônomo e lojas.</p>
      </div>

      <div className="space-y-6">
        {/* Motor de Conciliação */}
        <Card variant="glass" className="p-6">
          <h3 className="font-display font-semibold text-lg mb-4">Motor de Conciliação</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Sincronização Automática (07:00)</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Executar o bot de coleta todos os dias de manhÁ.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-[var(--bg-surface-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] transition-colors">
              <div>
                <p className="font-medium text-[var(--text-primary)]">Notificações Críticas por WhatsApp</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Avisar os sócios quando houver divergências de Pix.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-[var(--bg-surface-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>

            {lastRun && (
              <div className="mt-4 p-3 bg-[var(--bg-canvas)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                <p className="text-sm font-medium">Última Execução do Bot</p>
                <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-secondary)]">
                  <span>{new Date(lastRun.started_at).toLocaleString()}</span>
                  <span className={lastRun.status === 'success' ? 'text-[var(--color-accent-success)]' : 'text-[var(--color-accent-danger)]'}>
                    {lastRun.status.toUpperCase()}
                  </span>
                </div>
                {lastRun.log_text && <p className="text-xs mt-1 font-mono text-[var(--text-tertiary)]">{lastRun.log_text}</p>}
              </div>
            )}
          </div>
          <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
            <Button variant="primary" className="w-full sm:w-auto" disabled={loadingBots}>
              Forçar Execução do Motor Agora
            </Button>
          </div>
        </Card>

        {/* Gerenciamento de Lojas */}
        <Card variant="glass" className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-semibold text-lg">Gerenciamento de Lojas</h3>
            <Button variant="outline" size="sm" onClick={() => { setStoreToEdit(undefined); setIsFormOpen(true); }}>
              Nova Loja
            </Button>
          </div>
          {loadingStores ? (
             <div className="flex justify-center p-4">
             <LoadingSpinner size="sm" text="" />
           </div>
          ) : (
            <div className="space-y-3">
              {stores.map(store => (
                <div key={store.id} className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                  <div>
                    <p className="font-medium text-[var(--text-primary)] text-sm">{store.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Gerente: {store.manager || 'Não definido'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditStore(store)}>Editar</Button>
                    <Button variant="outline" size="sm" className="text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/30" onClick={() => handleDeleteStore(store)}>Excluir</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Bot de Automação — Credenciais */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-full bg-amber-400/15 flex items-center justify-center">
              <Bot size={17} className="text-amber-400" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">Bot de Automação</h3>
              <p className="text-xs text-[var(--text-tertiary)]">Credenciais para coleta automática de dados via Playwright.</p>
            </div>
          </div>

          {loadingCreds ? (
            <div className="flex justify-center p-4"><LoadingSpinner size="sm" text="" /></div>
          ) : (
            <div className="space-y-4">
              {botCreds.map((cred) => {
                const edit = credEdit[cred.portal];
                const username = edit?.username ?? cred.username;
                const password = edit?.password ?? cred.password;
                const showPw = edit?.showPw ?? false;
                const isSaving = savingCred === cred.portal;
                const isSaved = savedCred === cred.portal;

                return (
                  <div key={cred.portal} className="border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
                    {/* Portal Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{cred.portal_label}</p>
                        <a
                          href={cred.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[var(--color-primary)] flex items-center gap-1 hover:underline"
                        >
                          {cred.url} <ExternalLink size={9} />
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {cred.is_valid ? (
                          <span className="flex items-center gap-1 text-[10px] text-[var(--color-accent-teal)] bg-[var(--color-accent-teal)]/10 px-2 py-1 rounded-full border border-[var(--color-accent-teal)]/20">
                            <CheckCircle2 size={10} /> Válida
                          </span>
                        ) : cred.last_validated_at ? (
                          <span className="flex items-center gap-1 text-[10px] text-[var(--color-accent-danger)] bg-[var(--color-accent-danger)]/10 px-2 py-1 rounded-full border border-[var(--color-accent-danger)]/20">
                            <XCircle size={10} /> Inválida
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] bg-white/5 px-2 py-1 rounded-full border border-white/10">
                            <Clock size={10} /> Não validada
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Username */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1 block">Usuário / E-mail</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setCredEdit((prev) => ({ ...prev, [cred.portal]: { username: e.target.value, password: prev[cred.portal]?.password ?? cred.password, showPw: prev[cred.portal]?.showPw ?? false } }))}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1 block">Senha</label>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setCredEdit((prev) => ({ ...prev, [cred.portal]: { username: prev[cred.portal]?.username ?? cred.username, password: e.target.value, showPw: prev[cred.portal]?.showPw ?? false } }))}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setCredEdit((prev) => ({ ...prev, [cred.portal]: { username: prev[cred.portal]?.username ?? cred.username, password: prev[cred.portal]?.password ?? cred.password, showPw: !showPw } }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-white transition-colors"
                        >
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Error message */}
                    {cred.validation_error && (
                      <p className="text-[10px] text-[var(--color-accent-danger)] bg-[var(--color-accent-danger)]/10 px-3 py-2 rounded-lg">
                        Último erro: {cred.validation_error}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSaving}
                        onClick={async () => {
                          setSavingCred(cred.portal);
                          await updateCred.mutateAsync({ portal: cred.portal, username, password });
                          setSavingCred(null);
                          setSavedCred(cred.portal);
                          setTimeout(() => setSavedCred(null), 3000);
                        }}
                      >
                        {isSaved ? '✓ Salvo!' : isSaving ? 'Salvando...' : 'Salvar'}
                      </Button>
                      {cred.last_validated_at && (
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          Validado em: {new Date(cred.last_validated_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>




        {/* IA */}
        <Card variant="glass" className="p-6">
          <h3 className="font-display font-semibold text-lg mb-4">Inteligência Artificial (LLM)</h3>
          <AiSettingsForm />
        </Card>
      </div>

      <StoreFormDialog 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        storeToEdit={storeToEdit}
      />
    </div>
  );
}

function AiSettingsForm() {
  const { data: settings, isLoading } = useAiSettings();
  const saveSettings = useSaveAiSettings();

  const [provider, setProvider] = useState('google');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [apiKey, setApiKey] = useState('');

  // Update local state when query finishes
  useEffect(() => {
    if (settings) {
      setProvider(settings.provider || 'google');
      setModel(settings.model || 'gemini-2.0-flash');
      setApiKey(settings.api_key || '');
    }
  }, [settings]);

  if (isLoading) {
    return <div className="p-4 flex justify-center"><LoadingSpinner size="sm" text="" /></div>;
  }

  const handleSave = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    saveSettings.mutate({ provider, model, api_key: apiKey });
  };

  const modelOptions = {
    'google': ['gemini-2.0-flash', 'gemini-1.5-pro'],
    'openai': ['gpt-4o', 'gpt-4o-mini'],
    'anthropic': ['claude-3-5-sonnet-20240620', 'claude-3-haiku-20240307']
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1 block">Provedor</label>
        <select 
          value={provider} 
          onChange={(e) => {
            setProvider(e.target.value);
            setModel(modelOptions[e.target.value as keyof typeof modelOptions][0]);
          }}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors"
        >
          <option value="google">Google (Gemini)</option>
          <option value="openai">OpenAI (GPT)</option>
          <option value="anthropic">Anthropic (Claude)</option>
        </select>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1 block">Modelo</label>
        <select 
          value={model} 
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors"
        >
          {modelOptions[provider as keyof typeof modelOptions]?.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1 block">API Key</label>
        <input 
          type="password" 
          autoComplete="new-password"
          data-lpignore="true"
          data-1p-ignore="true"
          spellCheck="false"
          value={apiKey} 
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Insira sua chave de API..."
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors font-mono"
        />
        <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Sua chave é armazenada com segurança e usada exclusivamente pela Edge Function.</p>
      </div>

      <div className="pt-2 flex items-center justify-between">
        <Button onClick={handleSave} disabled={saveSettings.isPending}>
          {saveSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
