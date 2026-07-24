import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { PromptBox } from '@/components/chat/PromptBox';
import { MessageList, Message } from '@/components/chat/MessageList';
import { Bot, Plus, Trash2, Cpu, Key, BarChart3, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { useAiSettings, useSaveAiSettings } from '@/hooks/useAiSettings';

export const Route = createFileRoute('/agente')({
  component: AgentePage,
});

function AgentePage() {
  const [activeMainTab, setActiveMainTab] = useState<'chat' | 'providers' | 'telemetry' | 'inspector'>('chat');

  // State do Chat
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State das Configurações de IA
  const { data: aiSettings, isLoading: loadingSettings } = useAiSettings();
  const saveSettings = useSaveAiSettings();
  const [provider, setProvider] = useState<string>('google');
  const [model, setModel] = useState<string>('gemini-2.0-flash');
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    if (aiSettings) {
      setProvider(aiSettings.provider || 'google');
      setModel(aiSettings.model || 'gemini-2.0-flash');
      setApiKey(aiSettings.api_key || '');
    }
  }, [aiSettings]);

  const modelOptions = {
    google: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    openai: ['gpt-4o-mini', 'gpt-4o'],
    anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-haiku-20240307'],
  };

  const handleSaveSettings = () => {
    saveSettings.mutate(
      { provider, model, api_key: apiKey },
      {
        onSuccess: () => toast.success('Configurações da Inteligência Artificial salvas com sucesso!'),
        onError: (err: any) => toast.error(`Erro ao salvar: ${err.message}`),
      }
    );
  };

  // State dos Logs de Telemetria
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'reasoning' | 'payload' | 'response'>('reasoning');

  const { data: logs = [], isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['ai_execution_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_execution_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return [];
      }
      return data || [];
    },
  });

  const totalPromptTokens = logs.reduce((acc, log) => acc + (log.prompt_tokens || 0), 0);
  const totalCompletionTokens = logs.reduce((acc, log) => acc + (log.completion_tokens || 0), 0);
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const totalCostUsd = logs.reduce((acc, log) => acc + Number(log.estimated_cost || 0), 0);
  const totalMatches = logs.reduce((acc, log) => acc + (log.matches_applied_count || 0), 0);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadConversations = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    else {
      setConversations(data || []);
      if (data && data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0].id);
      }
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data: msgs, error: msgsError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgsError) {
      console.error(msgsError);
      return;
    }

    const formattedMessages: Message[] = (msgs || []).map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    setMessages(formattedMessages);
  };

  const handleNewConversation = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data, error } = await supabase
      .from('conversations')
      .insert([{ user_id: user.user.id, title: 'Nova Conversa' }])
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }
    setConversations([data, ...conversations]);
    setActiveConversationId(data.id);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('conversations').delete().eq('id', id);
    setConversations(conversations.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  const sendMessage = async (text: string, actionId: string | null) => {
    if (!text.trim()) return;

    let currentConvId = activeConversationId;

    if (!currentConvId) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Usuário não autenticado');
        return;
      }
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ user_id: user.user.id, title: text.substring(0, 30) }])
        .select()
        .single();
      if (error) {
        console.error(error);
        return;
      }
      currentConvId = data.id;
      setConversations([data, ...conversations]);
      setActiveConversationId(data.id);
    }

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);

    await supabase.from('messages').insert([{
      conversation_id: currentConvId,
      role: 'user',
      content: text
    }]);

    setIsLoading(true);

    try {
      const payload = {
        messages: messages.concat(userMessage).map(m => ({
          role: m.role,
          content: m.content
        }))
      };

      const { data: aiRes, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: payload
      });

      if (aiError) throw aiError;

      const finalAnswer = aiRes.text || "Sem resposta.";
      let mcpLogsData: any = null;

      if (aiRes.toolResults && aiRes.toolResults.length > 0) {
        mcpLogsData = aiRes.toolResults.map((tr: any) => ({
          action: tr.toolName,
          params: tr.args,
          result: tr.result
        }));

        mcpLogsData.forEach((log: any) => {
          supabase.from('mcp_logs').insert([{
            conversation_id: currentConvId,
            action: log.action,
            params: log.params,
            result: log.result
          }]).then();
        });
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: finalAnswer,
        mcpLogs: mcpLogsData
      };

      setMessages(prev => [...prev, assistantMessage]);

      await supabase.from('messages').insert([{
        conversation_id: currentConvId,
        role: 'assistant',
        content: finalAnswer
      }]);

    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao processar mensagem com a IA');
      const errorMsg: Message = { id: Date.now().toString(), role: 'assistant', content: `Ocorreu um erro: ${err.message}` };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho Executivo do Centro de Comando de IA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[var(--bg-canvas)] rounded-[10px] flex items-center justify-center text-white">
                <Cpu size={24} />
              </div>
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl flex items-center gap-2 text-white">
                Central de Inteligência Artificial & Telemetria
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-mono">Headless IA Engine</Badge>
              </h1>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Gestão centralizada de modelos, telemetria de consumo, custos e auditoria em tempo real.
              </p>
            </div>
          </div>

          {/* Abas Superiores de Navegação */}
          <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10 gap-1 text-xs shrink-0 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveMainTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all ${activeMainTab === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-tertiary)] hover:text-white'}`}
            >
              <Bot size={15} /> 💬 Chat Assistente
            </button>
            <button
              onClick={() => setActiveMainTab('providers')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all ${activeMainTab === 'providers' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-tertiary)] hover:text-white'}`}
            >
              <Key size={15} /> ⚙️ Provedores & API Keys
            </button>
            <button
              onClick={() => setActiveMainTab('telemetry')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all ${activeMainTab === 'telemetry' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-tertiary)] hover:text-white'}`}
            >
              <BarChart3 size={15} /> 📊 Telemetria & Custos
            </button>
            <button
              onClick={() => setActiveMainTab('inspector')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-all ${activeMainTab === 'inspector' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-tertiary)] hover:text-white'}`}
            >
              <Search size={15} /> 🔍 Inspector de JSON
            </button>
          </div>
        </div>

        {/* CONTEÚDO DA ABA 1: CHAT DO AGENTE */}
        {activeMainTab === 'chat' && (
          <div className="h-[680px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden flex flex-col md:flex-row relative">
            <div className="w-full md:w-[260px] bg-black/20 border-r border-[var(--border-subtle)] flex flex-col shrink-0 pt-4">
              <div className="px-4 pb-4">
                <button
                  onClick={handleNewConversation}
                  className="w-full bg-[var(--text-primary)] text-[var(--bg-canvas)] rounded-full py-2.5 px-4 flex items-center justify-between font-medium text-sm hover:bg-[var(--text-secondary)] transition-colors shadow-sm"
                >
                  <span>Nova Conversa</span>
                  <Plus size={16} />
                </button>
              </div>

              <div className="px-4 pb-2 text-[11px] font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">Histórico</div>

              <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar pb-4">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer flex justify-between items-center group transition-all duration-200 ${activeConversationId === conv.id ? 'bg-[var(--bg-surface-elevated)] font-medium text-[var(--text-primary)]' : 'hover:bg-white/5 text-[var(--text-secondary)]'}`}
                  >
                    <div className="truncate text-[13px] flex-1 mr-2">{conv.title || 'Nova Conversa'}</div>
                    <button
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-tertiary)] hover:text-[var(--color-accent-danger)]"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
              <div className="flex-1 overflow-y-auto px-4 md:px-12 pt-4 pb-32 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] opacity-60">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mb-4 shadow-xl shadow-indigo-500/20">
                      <Bot size={32} />
                    </div>
                    <h2 className="text-xl font-display font-medium text-white">Como posso ajudar na oficina?</h2>
                    <p className="mt-1 text-xs text-center max-w-md">Conectado ao sistema da oficina. Pergunte sobre CMV, Contas a Pagar, ou Conciliação.</p>
                  </div>
                )}
                <MessageList messages={messages} isLoading={isLoading} />
                <div ref={messagesEndRef} />
              </div>

              <div className="absolute bottom-4 left-0 right-0 px-4 md:px-12 pointer-events-none">
                <div className="max-w-3xl mx-auto pointer-events-auto">
                  <PromptBox onSubmitMessage={sendMessage} isSending={isLoading} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: PROVEDORES & API KEYS */}
        {activeMainTab === 'providers' && (
          <Card variant="elevated" className="p-6 space-y-6 max-w-3xl mx-auto border border-white/10 bg-black/30">
            <div>
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <span>⚙️</span> Provedores de Inteligência Artificial
              </h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Escolha o provedor e modelo LLM para executar as conciliações silenciosas em segundo plano.
              </p>
            </div>

            {loadingSettings ? (
              <div className="py-8 text-center"><LoadingSpinner size="sm" text="Carregando configurações de IA..." /></div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1 block font-bold">Provedor LLM</label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value);
                      setModel(modelOptions[e.target.value as keyof typeof modelOptions][0]);
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="google">Google Gemini (Recomendado)</option>
                    <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                    <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1 block font-bold">Modelo</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {modelOptions[provider as keyof typeof modelOptions]?.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-1 block font-bold">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Insira sua chave de API..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  />
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Sua chave é armazenada com segurança e criptografia no banco de dados.</p>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={saveSettings.isPending} className="bg-indigo-600 hover:bg-indigo-500">
                    {saveSettings.isPending ? 'Salvando...' : 'Salvar Provedor de IA'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* CONTEÚDO DA ABA 3: TELEMETRIA & CUSTOS */}
        {activeMainTab === 'telemetry' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-bold text-white">📊 Métricas de Consumo & Custos Acumulados</h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Visão consolidada do uso de tokens e investimento de IA em tempo real.</p>
              </div>
              <Button onClick={() => refetchLogs()} variant="secondary" className="text-xs px-3 py-1.5 gap-1.5">
                <RefreshCw size={14} /> Atualizar Métricas
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card variant="elevated" className="p-5 space-y-1 bg-black/30 border-white/10">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Tokens Totais</span>
                <p className="text-2xl font-bold font-mono text-white">{totalTokens.toLocaleString('pt-BR')}</p>
                <span className="text-[11px] text-[var(--text-tertiary)] block font-mono">
                  {totalPromptTokens.toLocaleString('pt-BR')} prompt / {totalCompletionTokens.toLocaleString('pt-BR')} resposta
                </span>
              </Card>

              <Card variant="elevated" className="p-5 space-y-1 bg-black/30 border-white/10">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Custo Estimado</span>
                <p className="text-2xl font-bold font-mono text-[var(--color-accent-teal)]">
                  ${totalCostUsd.toFixed(5)} USD
                </p>
                <span className="text-[11px] text-[var(--text-tertiary)] block font-mono">
                  ~R$ {(totalCostUsd * 5.60).toFixed(4)} BRL
                </span>
              </Card>

              <Card variant="elevated" className="p-5 space-y-1 bg-black/30 border-white/10">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Chamadas Auditadas</span>
                <p className="text-2xl font-bold font-mono text-indigo-400">{logs.length}</p>
                <span className="text-[11px] text-[var(--text-tertiary)] block font-mono">Execuções silenciosas em background</span>
              </Card>

              <Card variant="elevated" className="p-5 space-y-1 bg-black/30 border-white/10">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block">Matches Aplicados</span>
                <p className="text-2xl font-bold font-mono text-[var(--color-accent-light-blue)]">{totalMatches}</p>
                <span className="text-[11px] text-[var(--text-tertiary)] block font-mono">Confiança &ge; 90%</span>
              </Card>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 4: INSPECTOR DE JSON & RACIOCÍNIO */}
        {activeMainTab === 'inspector' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-bold text-white">🔍 DevTools Inspector de Payloads & Raciocínio</h3>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Inspecione o JSON bruto de envio, resposta e o passo-a-passo textual da IA.</p>
              </div>
              <Button onClick={() => refetchLogs()} variant="secondary" className="text-xs px-3 py-1.5 gap-1.5">
                <RefreshCw size={14} /> Atualizar Logs
              </Button>
            </div>

            {loadingLogs ? (
              <div className="p-8 text-center"><LoadingSpinner size="sm" text="Carregando logs..." /></div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center bg-black/20 rounded-xl border border-white/5 text-xs text-[var(--text-tertiary)]">
                Nenhum log registrado ainda. As chamadas em background aparecerão aqui automaticamente.
              </div>
            ) : (
              <div className="space-y-6">
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
                          <th className="p-3 text-center">Ações</th>
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

                {selectedLog && (
                  <Card variant="elevated" className="p-5 border border-indigo-500/30 space-y-4 bg-black/40">
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="text-indigo-400">🔍 Inspector de Payload & JSON</span>
                        <span className="text-xs font-mono font-normal text-[var(--text-tertiary)]">ID: {selectedLog.id}</span>
                      </h4>

                      <div className="flex bg-black/50 p-1 rounded-lg border border-white/10 gap-1 text-xs">
                        <button
                          onClick={() => setActiveInspectorTab('reasoning')}
                          className={`px-3 py-1 rounded font-medium transition-colors ${activeInspectorTab === 'reasoning' ? 'bg-indigo-600 text-white' : 'text-[var(--text-tertiary)] hover:text-white'}`}
                        >
                          🧠 Raciocínio (Chain of Thought)
                        </button>
                        <button
                          onClick={() => setActiveInspectorTab('payload')}
                          className={`px-3 py-1 rounded font-medium transition-colors ${activeInspectorTab === 'payload' ? 'bg-indigo-600 text-white' : 'text-[var(--text-tertiary)] hover:text-white'}`}
                        >
                          📥 Input JSON (Payload)
                        </button>
                        <button
                          onClick={() => setActiveInspectorTab('response')}
                          className={`px-3 py-1 rounded font-medium transition-colors ${activeInspectorTab === 'response' ? 'bg-indigo-600 text-white' : 'text-[var(--text-tertiary)] hover:text-white'}`}
                        >
                          📤 Output JSON (Resposta)
                        </button>
                      </div>
                    </div>

                    <div className="bg-black/80 rounded-xl p-4 border border-white/10 overflow-x-auto max-h-[350px] custom-scrollbar text-xs font-mono">
                      {activeInspectorTab === 'reasoning' && (
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

                      {activeInspectorTab === 'payload' && (
                        <pre className="text-teal-400 whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(selectedLog.raw_payload_json, null, 2)}
                        </pre>
                      )}

                      {activeInspectorTab === 'response' && (
                        <pre className="text-purple-300 whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(selectedLog.raw_response_json, null, 2)}
                        </pre>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </AppShell>
  );
}
