import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { PromptInput } from '@/components/chat/PromptInput';
import { MessageList } from '@/components/chat/MessageList';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Bot, Plus, Trash2, Settings, Terminal, Workflow, Pencil, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { CustosPanel } from '@/components/agente/CustosPanel';
import { ConfiguracoesPanel } from '@/components/agente/ConfiguracoesPanel';
import { LogsAgentePanel } from '@/components/agente/LogsAgentePanel';
import { LogsMotorPanel } from '@/components/agente/LogsMotorPanel';

export const Route = createFileRoute('/agente')({
  component: AgentePage,
});

function AgentePage() {
  type ActiveView = 'chat' | 'config' | 'logs-agent' | 'logs-motor' | 'costs';
  const [activeView, setActiveView] = useState<ActiveView>('chat');

  // State do Chat
  const [conversations, setConversations] = useState<any[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  
  useEffect(() => { 
    activeConversationIdRef.current = activeConversationId; 
  }, [activeConversationId]);
  
  // transport com auth dinâmico — prepareSendMessagesRequest lê o token em cada request
  const chatTransport = React.useMemo(() => new DefaultChatTransport({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
    prepareSendMessagesRequest: async (request) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      return {
        ...request,
        headers: {
          ...(request.headers || {}),
          'Authorization': `Bearer ${token}`
        },
        body: {
          ...(request.body || {}),
          messages: request.messages,
          conversation_id: activeConversationIdRef.current
        }
      };
    }
  }), []);

  const { messages, setMessages, sendMessage: appendMessage, status } = useChat({
    transport: chatTransport,
    onError: (error) => {
      console.error('Erro na resposta do Agente IAS:', error);
      const cleanMsg = typeof error === 'string' ? error : error?.message || 'Falha na conexão com a Edge Function';
      toast.error(`Erro no Agente IAS: ${cleanMsg.substring(0, 120)}`);
    },
    onFinish: async (message) => {
      if (activeConversationIdRef.current) {
        let textContent = '';
        if (typeof (message as any).content === 'string' && (message as any).content.trim()) {
          textContent = (message as any).content.trim();
        } else if (Array.isArray((message as any).parts)) {
          textContent = (message as any).parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('\n')
            .trim();
        }

        if (!textContent) return;

        const { error } = await supabase.from('messages').insert([{
          conversation_id: activeConversationIdRef.current,
          role: 'assistant',
          content: textContent
        }]);
        if (error) {
          console.error('Erro ao salvar mensagem do assistente:', error);
        }
      }
    }
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Subscription em tempo real (Supabase Realtime) nas mensagens da conversa ativa
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`messages:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg || newMsg.conversation_id !== activeConversationIdRef.current) return;

          setMessages((prevMessages) => {
            const exists = prevMessages.some(
              (m) => m.id === newMsg.id || (m.role === newMsg.role && m.content === newMsg.content)
            );
            if (exists) return prevMessages;

            return [
              ...prevMessages,
              {
                id: newMsg.id,
                role: newMsg.role,
                content: newMsg.content,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, setMessages]);

  const handleSelectConversation = (id: string) => {
    setActiveView('chat');
    if (id === activeConversationIdRef.current) return;
    setMessages([]);
    setActiveConversationId(id);
    activeConversationIdRef.current = id;
    loadMessages(id);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    
    // Assinatura para atualizar títulos automaticamente (ex: auto-titulação do LLM em background)
    const channel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          setConversations(prev => prev.map(c => c.id === payload.new.id ? { ...c, title: payload.new.title } : c));
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      if (data && data.length > 0 && !activeConversationIdRef.current) {
        setActiveConversationId(data[0].id);
        loadMessages(data[0].id);
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

    const formattedMessages: any[] = (msgs || []).map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    setMessages(formattedMessages);
  };

  const handleNewConversation = async () => {
    setActiveView('chat');
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('conversations').delete().eq('id', id);
    setConversations(conversations.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  const handleRenameConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    const newTitle = window.prompt("Digite o novo título da conversa:", conv.title || "Nova Conversa");
    if (newTitle && newTitle.trim() !== "" && newTitle !== conv.title) {
      const { error } = await supabase.from('conversations').update({ title: newTitle }).eq('id', id);
      if (!error) {
        setConversations(conversations.map(c => c.id === id ? { ...c, title: newTitle } : c));
      } else {
        toast.error("Erro ao renomear conversa");
      }
    }
  };

  const sendMessage = async (text: string, meta?: any) => {
    if (!text.trim()) return;

    let currentConvId = activeConversationId;

    if (!currentConvId) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error('Usuário não autenticado');
        return;
      }
      const initialTitle = text.length > 30 ? text.substring(0, 30) + '...' : text;
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ user_id: user.user.id, title: initialTitle }])
        .select()
        .single();
      if (error) {
        console.error(error);
        toast.error('Erro ao criar conversa');
        return;
      }
      currentConvId = data.id;
      setConversations([{...data, title: initialTitle}, ...conversations]);
      setActiveConversationId(data.id);
      activeConversationIdRef.current = data.id;

      // Smart Title Generation via Edge Function in background
      (async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          const prompt = `Gere um título super curto (máximo 4 palavras) que resuma esta mensagem: "${text}"`;
          
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: prompt }],
              conversation_id: 'smart-title-gen' // Evitar logar no histórico principal
            })
          });

          if (response.ok) {
             const resText = await response.text();
             // Simple extraction assuming it streams or returns text
             const cleanTitle = resText.replace(/["'*]/g, '').trim();
             if (cleanTitle && cleanTitle.length < 50) {
               await supabase.from('conversations').update({ title: cleanTitle }).eq('id', data.id);
             }
          }
        } catch (err) {
          console.warn("Smart title generation failed (fallback to snippet):", err);
        }
      })();
    }

    // Salva silenciosamente no banco em background (não-bloqueante)
    (supabase.from as any)('messages').insert([{
      conversation_id: currentConvId,
      role: 'user',
      content: text
    }]).then(({ error }: any) => {
      if (error) {
        console.error('Erro ao salvar mensagem no Supabase:', error);
        toast.error('Erro ao enviar mensagem para o histórico');
      }
    });

    // SDK v4: apenas { text } — auth e conversation_id injetados pelo transport
    try {
      await appendMessage({ text });
    } catch (err) {
      console.warn("Erro ao disparar appendMessage (Edge Function pode estar offline):", err);
    }
  };

  return (
    <AppShell>
      <div className="absolute top-20 left-0 right-0 bottom-0 z-30 animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col md:flex-row bg-[var(--bg-canvas)] overflow-hidden">
        
        {/* Sidebar Histórico */}
        <div className="w-full md:w-[260px] bg-transparent border-r border-[var(--border-subtle)] flex flex-col overflow-hidden shrink-0 pt-4">
          
          {/* Header Oficina GPT (Top of Sidebar) */}
          <div className="px-4 pb-3 border-b border-[var(--border-subtle)] mb-3 flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shadow-sm">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)] leading-none">Oficina GPT</h3>
              <p className="text-[10px] text-[var(--text-tertiary)] font-medium mt-1">Central IAS</p>
            </div>
          </div>

          {/* Action Button: Nova Conversa */}
          <div className="px-4 pb-3 shrink-0">
            <button
              onClick={handleNewConversation}
              className="group w-full bg-[var(--text-primary)] text-[var(--bg-canvas)] rounded-full py-2.5 px-4 flex items-center justify-between font-medium text-sm hover:bg-[var(--text-secondary)] transition-all duration-200 active:scale-95 shadow-sm"
            >
              <span>Nova Conversa</span>
              <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90 group-active:scale-90" />
            </button>
          </div>

          {/* Section Divider Label */}
          <div className="px-4 pb-2 text-[11px] font-semibold tracking-wider text-[var(--text-tertiary)] uppercase shrink-0">
            Histórico
          </div>

          {/* Scrollable History List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar pb-2">
            {(showAllHistory ? conversations : conversations.slice(0, 5)).map(conv => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`px-3 py-2.5 rounded-lg cursor-pointer flex justify-between items-center group transition-all duration-200 ${
                  activeConversationId === conv.id
                    ? 'bg-[var(--bg-surface-elevated)] font-medium text-[var(--text-primary)]'
                    : 'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="truncate text-[13px] flex-1 mr-2">{conv.title || 'Nova Conversa'}</div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleRenameConversation(conv.id, e)}
                    className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    title="Renomear"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--color-accent-danger)]"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-center p-6 text-sm text-[var(--text-tertiary)]">Nenhuma conversa</div>
            )}
            {conversations.length > 5 && !showAllHistory && (
              <button 
                onClick={() => setShowAllHistory(true)}
                className="w-full text-[11px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-center py-3 transition-colors mt-2"
              >
                Ver mais {conversations.length - 5} conversas...
              </button>
            )}
          </div>

          {/* Bottom Anchored Section: Configurações & Logs */}
          <div className="mt-auto px-3 py-3 border-t border-[var(--border-subtle)] space-y-1 shrink-0 bg-[var(--bg-canvas)]">
            <button
              onClick={() => setActiveView('config')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeView === 'config' ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'}`}
            >
              <Settings size={15} />
              <span>Configurações</span>
            </button>
            <button
              onClick={() => setActiveView('logs-agent')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeView === 'logs-agent' ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'}`}
            >
              <Terminal size={15} />
              <span>Log do Agente IA</span>
            </button>
            <button
              onClick={() => setActiveView('logs-motor')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeView === 'logs-motor' ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'}`}
            >
              <Workflow size={15} />
              <span>Log do Motor</span>
            </button>
            <button
              onClick={() => setActiveView('costs')}
              className={`flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeView === 'costs' ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]'}`}
            >
              <BarChart3 size={15} />
              <span>Custos</span>
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 bg-transparent flex flex-col relative overflow-hidden">
          
          {activeView === 'config' && <div className="flex-1 overflow-y-auto custom-scrollbar"><ConfiguracoesPanel /></div>}
          {activeView === 'costs' && <div className="flex-1 overflow-y-auto custom-scrollbar"><CustosPanel /></div>}
          {activeView === 'logs-agent' && <div className="flex-1 overflow-y-auto custom-scrollbar"><LogsAgentePanel /></div>}
          {activeView === 'logs-motor' && <div className="flex-1 overflow-y-auto custom-scrollbar"><LogsMotorPanel /></div>}
          
          <div className={`flex-1 flex-col relative overflow-hidden ${activeView === 'chat' ? 'flex' : 'hidden'}`}>
            {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-16 pt-4 pb-32 custom-scrollbar relative">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] mb-6 shadow-sm">
                  <Bot size={32} />
                </div>
                <h2 className="text-2xl font-display font-medium text-[var(--text-primary)]">Como posso ajudar?</h2>
                <p className="mt-2 text-sm text-center max-w-md text-[var(--text-secondary)]">
                  Conectado aos sistemas da oficina. Pergunte sobre CMV, Contas a Pagar, ou Conciliação.
                </p>
              </div>
            )}
            <MessageList messages={messages} isLoading={isLoading} />
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area (Flutuante) */}
          <div className="absolute bottom-6 left-0 right-0 px-4 md:px-16 pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <PromptInput onSubmit={(val, meta) => sendMessage(val, meta)} disabled={isLoading} />
            </div>
          </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

