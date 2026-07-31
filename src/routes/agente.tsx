import { createFileRoute, Link } from '@tanstack/react-router';
import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/lib/supabase';
import { PromptInput } from '@/components/chat/PromptInput';
import { MessageList } from '@/components/chat/MessageList';
import { useChat } from '@ai-sdk/react';
import { Bot, Plus, Trash2, Settings, Terminal } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/agente')({
  component: AgentePage,
});

function AgentePage() {
  // State do Chat
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  
  useEffect(() => { 
    activeConversationIdRef.current = activeConversationId; 
  }, [activeConversationId]);
  
  const { messages, setMessages, append, isLoading } = useChat({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
    onFinish: async (message) => {
      if (activeConversationIdRef.current) {
        await supabase.from('messages').insert([{ conversation_id: activeConversationIdRef.current, role: 'assistant', content: message.content }]);
      }
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
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

  const sendMessage = async (text: string, meta?: any) => {
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
      activeConversationIdRef.current = data.id;
    }

    await supabase.from('messages').insert([{
      conversation_id: currentConvId,
      role: 'user',
      content: text
    }]);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    append(
      { role: 'user', content: text },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

  return (
    <AppShell>
      <div className="absolute top-16 left-0 right-0 bottom-0 z-30 animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col md:flex-row bg-[var(--bg-canvas)] overflow-hidden">
        
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
              className="w-full bg-[var(--text-primary)] text-[var(--bg-canvas)] rounded-full py-2.5 px-4 flex items-center justify-between font-medium text-sm hover:bg-[var(--text-secondary)] transition-colors shadow-sm"
            >
              <span>Nova Conversa</span>
              <Plus size={16} />
            </button>
          </div>

          {/* Section Divider Label */}
          <div className="px-4 pb-2 text-[11px] font-semibold tracking-wider text-[var(--text-tertiary)] uppercase shrink-0">
            Histórico
          </div>

          {/* Scrollable History List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar pb-2">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConversationId(conv.id);
                  loadMessages(conv.id);
                }}
                className={`px-3 py-2.5 rounded-lg cursor-pointer flex justify-between items-center group transition-all duration-200 ${
                  activeConversationId === conv.id
                    ? 'bg-[var(--bg-surface-elevated)] font-medium text-[var(--text-primary)]'
                    : 'hover:bg-black/5 text-[var(--text-secondary)]'
                }`}
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
            {conversations.length === 0 && (
              <div className="text-center p-6 text-sm text-[var(--text-tertiary)]">Nenhuma conversa</div>
            )}
          </div>

          {/* Bottom Anchored Section: Configurações & Logs */}
          <div className="mt-auto px-3 py-3 border-t border-[var(--border-subtle)] space-y-1 shrink-0 bg-[var(--bg-canvas)]">
            <Link
              to="/configuracoes"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
            >
              <Settings size={15} />
              <span>Configurações</span>
            </Link>
            <Link
              to="/configuracoes"
              hash="logs"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
            >
              <Terminal size={15} />
              <span>Logs do Sistema</span>
            </Link>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-transparent flex flex-col relative overflow-hidden">
          
          {/* Header Limpo */}
          <div className="px-6 py-3 flex justify-between items-center z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent-teal)] animate-pulse" />
              <span className="font-medium">Conectado ao ConciliaMec IAS</span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-16 pt-4 pb-32 custom-scrollbar relative">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] opacity-60">
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
    </AppShell>
  );
}

