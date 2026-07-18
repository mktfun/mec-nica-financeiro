import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { PromptBox } from '@/components/chat/PromptBox';
import { MessageList, Message } from '@/components/chat/MessageList';
import { Bot, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/agente')({
  component: AgentePage,
});

function AgentePage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      
    const { data: logs, error: logsError } = await supabase
      .from('mcp_logs')
      .select('*')
      .eq('conversation_id', conversationId);

    if (msgsError) {
      console.error(msgsError);
      return;
    }

    // Attach logs to the last assistant message if possible (simplified)
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
    
    // Create conversation if none active
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
    
    // Save to DB
    await supabase.from('messages').insert([{
      conversation_id: currentConvId,
      role: 'user',
      content: text
    }]);

    setIsLoading(true);

    try {
      let mcpLogsData: any = null;
      let finalAnswer = "Entendido.";

      // Call MCP via Edge Function if action is selected
      if (actionId) {
        // We use default empty params for this simple test phase
        const params = {}; 
        
        const { data: mcpRes, error: mcpError } = await supabase.functions.invoke('mcp-proxy', {
          body: { action: actionId, params }
        });

        if (mcpError) throw mcpError;

        // Save log
        await supabase.from('mcp_logs').insert([{
          conversation_id: currentConvId,
          action: actionId,
          params: params,
          result: mcpRes
        }]);

        mcpLogsData = [{ action: actionId, params }];
        finalAnswer = `Acessei o MCP (${actionId}) e obtive o retorno. \n\nResultado bruto: \n${JSON.stringify(mcpRes, null, 2).substring(0, 500)}...`;
      } else {
        // Just mock a chat response if no MCP action
        finalAnswer = "Por enquanto, estou focado em testar a integração com o MCP. Clique no ícone de engrenagem nas ferramentas para escolher uma ação do Oficina.";
      }

      const assistantMessage: Message = { 
        id: (Date.now()+1).toString(), 
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
    <div className="h-[calc(100vh-2rem)] flex gap-4 overflow-hidden p-2">
      {/* Sidebar Histórico */}
      <div className="w-64 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center">
          <h2 className="font-semibold text-[var(--text-primary)]">Conversas</h2>
          <button onClick={handleNewConversation} className="p-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-md hover:bg-[var(--color-primary)]/20 transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              onClick={() => setActiveConversationId(conv.id)}
              className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group transition-colors ${activeConversationId === conv.id ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}
            >
              <div className="truncate text-sm flex-1 mr-2">{conv.title || 'Nova Conversa'}</div>
              <button 
                onClick={(e) => handleDeleteConversation(conv.id, e)} 
                className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${activeConversationId === conv.id ? 'hover:bg-black/20 text-white' : 'hover:bg-black/5 text-[var(--color-accent-danger)]'}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-center p-4 text-xs text-[var(--text-tertiary)]">
              Nenhuma conversa salva
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-[var(--bg-surface-default)] rounded-2xl flex flex-col relative">
        <div className="flex-1 overflow-y-auto pb-24 relative">
           <MessageList messages={messages} isLoading={isLoading} />
           <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4">
          <PromptBox 
            onSubmitMessage={sendMessage} 
            isSending={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
