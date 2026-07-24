import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
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
import { Bot, Eye, EyeOff, CheckCircle2, XCircle, Clock, ExternalLink, Terminal, AlertTriangle } from 'lucide-react';

export const Route = createFileRoute('/configuracoes')({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
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
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
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
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Executar o bot de coleta todos os dias de manhã.</p>
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

          {/* Logs de Automação */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center">
                <Terminal size={17} className="text-blue-400" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">Logs de Automação</h3>
                <p className="text-xs text-[var(--text-tertiary)]">Trilha de auditoria das execuções e validações do bot.</p>
              </div>
            </div>

            {loadingLogs ? (
              <div className="flex justify-center p-4"><LoadingSpinner size="sm" text="" /></div>
            ) : botLogs.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4">Nenhum log registrado ainda.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {botLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-black/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? (
                          <CheckCircle2 size={14} className="text-[var(--color-accent-teal)]" />
                        ) : log.status === 'error' ? (
                          <XCircle size={14} className="text-[var(--color-accent-danger)]" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-400" />
                        )}
                        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
                          {log.bot_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">{log.message}</p>
                    {log.payload && (
                      <pre className="text-[10px] text-[var(--text-tertiary)] font-mono bg-black/40 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>


          {/* IA */}
          <Card variant="glass" className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Inteligência Artificial (LLM)</h3>
            <AiSettingsForm />
          </Card>
        </div>
      </div>

      <StoreFormDialog 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        storeToEdit={storeToEdit}
      />
    </AppShell>
  );
}

import { useAiSettings, useSaveAiSettings } from '@/hooks/useAiSettings';

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

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saveSettings.isPending}>
          {saveSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      {/* Seção de Telemetria e Auditoria de IA */}
      <div className="pt-8 border-t border-[var(--border-subtle)] mt-8">
        <AiTelemetryDashboard />
      </div>
    </div>
  );
}

function AiTelemetryDashboard() {
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'payload' | 'response' | 'reasoning'>('reasoning');

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['ai_execution_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_execution_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.warn('Tabela ai_execution_logs ainda não criada ou vazia:', error);
        return [];
      }
      return data || [];
    }
  });

  const totalPromptTokens = logs.reduce((acc, log) => acc + (log.prompt_tokens || 0), 0);
  const totalCompletionTokens = logs.reduce((acc, log) => acc + (log.completion_tokens || 0), 0);
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCostUsd = logs.reduce((acc, log) => acc + Number(log.estimated_cost || 0), 0);
  const totalMatches = logs.reduce((acc, log) => acc + (log.matches_applied_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">📊</span>
            Central de Telemetria & Audit Trail da IA
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            Registro imutável de chamadas, consumo de tokens, custos e inspeção de payloads JSON em background.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="secondary" className="text-xs px-3 py-1.5 gap-1.5">
          🔄 Atualizar Logs
        </Button>
      </div>

      {/* Cards de Métricas (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Tokens Totais</span>
          <p className="text-xl font-bold font-mono text-white">{totalTokens.toLocaleString('pt-BR')}</p>
          <span className="text-[10px] text-[var(--text-tertiary)] block">
            {totalPromptTokens.toLocaleString('pt-BR')} in / {totalCompletionTokens.toLocaleString('pt-BR')} out
          </span>
        </Card>

        <Card variant="elevated" className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Custo Estimado</span>
          <p className="text-xl font-bold font-mono text-[var(--color-accent-teal)]">
            ${totalCostUsd.toFixed(5)} USD
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block">
            ~R$ {(totalCostUsd * 5.60).toFixed(4)} BRL
          </span>
        </Card>

        <Card variant="elevated" className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Chamadas Auditadas</span>
          <p className="text-xl font-bold font-mono text-indigo-400">{logs.length}</p>
          <span className="text-[10px] text-[var(--text-tertiary)] block">Registradas em background</span>
        </Card>

        <Card variant="elevated" className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Matches Aplicados</span>
          <p className="text-xl font-bold font-mono text-[var(--color-accent-light-blue)]">{totalMatches}</p>
          <span className="text-[10px] text-[var(--text-tertiary)] block">Confiança &ge; 90%</span>
        </Card>
      </div>

      {/* Tabela de Telemetria e Inspector */}
      {isLoading ? (
        <div className="p-8 text-center"><LoadingSpinner size="sm" text="Carregando telemetria..." /></div>
      ) : logs.length === 0 ? (
        <div className="p-6 text-center bg-black/20 rounded-xl border border-white/5 text-xs text-[var(--text-tertiary)]">
          Nenhum log de execução registrado ainda. As chamadas efetuadas pela IA em background aparecerão aqui automaticamente.
        </div>
      ) : (
        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-canvas)]">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-sans tabular-nums">
              <thead className="bg-[var(--bg-surface-elevated)] border-b border-[var(--border-subtle)] sticky top-0 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Provedor / Modelo</th>
                  <th className="p-3 text-center">Matches</th>
                  <th className="p-3 text-right">Tokens</th>
                  <th className="p-3 text-right">Custo ($)</th>
                  <th className="p-3 text-right">Tempo (ms)</th>
                  <th className="p-3 text-center">Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-[var(--text-secondary)]">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 font-semibold text-white">
                      <span className="capitalize">{log.provider}</span> • <span className="text-[var(--text-tertiary)] font-mono">{log.model}</span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge className="bg-[var(--color-accent-teal)]/15 text-[var(--color-accent-teal)] font-bold text-[10px]">
                        {log.matches_applied_count || 0}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono text-white">
                      {log.total_tokens || 0}
                    </td>
                    <td className="p-3 text-right font-mono text-[var(--color-accent-teal)]">
                      ${Number(log.estimated_cost || 0).toFixed(5)}
                    </td>
                    <td className="p-3 text-right font-mono text-[var(--text-tertiary)]">
                      {log.execution_time_ms || 0}ms
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                        className="px-2.5 py-1 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 border border-indigo-500/30 transition-colors"
                      >
                        {selectedLog?.id === log.id ? 'Fechar' : '🔍 Inspecionar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspector DevTools do Log Selecionado */}
      {selectedLog && (
        <Card variant="elevated" className="p-5 border border-indigo-500/30 space-y-4 bg-black/40">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400">🔍 Inspector de Payload & JSON</span>
              <span className="text-xs font-mono font-normal text-[var(--text-tertiary)]">ID: {selectedLog.id}</span>
            </h4>

            {/* Abas do Inspector */}
            <div className="flex bg-black/50 p-1 rounded-lg border border-white/10 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('reasoning')}
                className={`px-3 py-1 rounded font-medium transition-colors ${activeTab === 'reasoning' ? 'bg-indigo-600 text-white' : 'text-[var(--text-tertiary)] hover:text-white'}`}
              >
                🧠 Raciocínio (Chain of Thought)
              </button>
              <button
                onClick={() => setActiveTab('payload')}
                className={`px-3 py-1 rounded font-medium transition-colors ${activeTab === 'payload' ? 'bg-indigo-600 text-white' : 'text-[var(--text-tertiary)] hover:text-white'}`}
              >
                📥 Input JSON (Payload)
              </button>
              <button
                onClick={() => setActiveTab('response')}
                className={`px-3 py-1 rounded font-medium transition-colors ${activeTab === 'response' ? 'bg-indigo-600 text-white' : 'text-[var(--text-tertiary)] hover:text-white'}`}
              >
                📤 Output JSON (Resposta)
              </button>
            </div>
          </div>

          {/* Conteúdo da Aba Selecionada */}
          <div className="bg-black/80 rounded-xl p-4 border border-white/10 overflow-x-auto max-h-[350px] custom-scrollbar text-xs font-mono">
            {activeTab === 'reasoning' && (
              <div className="space-y-3">
                <span className="text-[10px] text-indigo-400 uppercase tracking-wider block font-sans font-bold">Passos & Justificativas Registradas:</span>
                {Array.isArray(selectedLog.reasoning_steps_json) && selectedLog.reasoning_steps_json.length > 0 ? (
                  selectedLog.reasoning_steps_json.map((step: any, i: number) => (
                    <div key={i} className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-100 font-sans leading-relaxed">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-white font-mono text-[11px]">Match #{i + 1} (Confiança: {step.confidence}%)</strong>
                        <span className="text-[10px] text-indigo-300 font-mono">OS #{step.os_number || 'S/N'}</span>
                      </div>
                      <p className="text-xs text-indigo-200">{step.reasoning}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[var(--text-tertiary)] font-sans">Nenhum raciocínio textual gravado nesta chamada.</p>
                )}
              </div>
            )}

            {activeTab === 'payload' && (
              <pre className="text-teal-400 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(selectedLog.raw_payload_json, null, 2)}
              </pre>
            )}

            {activeTab === 'response' && (
              <pre className="text-purple-300 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(selectedLog.raw_response_json, null, 2)}
              </pre>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

