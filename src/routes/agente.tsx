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
      // Call the AI Edge Function instead of mcp-proxy directly
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

      // Se a IA chamou tools (mcp), a edge function pode nos devolver no payload
      if (aiRes.toolResults && aiRes.toolResults.length > 0) {
        mcpLogsData = aiRes.toolResults.map((tr: any) => ({
          action: tr.toolName,
          params: tr.args,
          result: tr.result
        }));

        // Log everything asynchronously
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
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Histórico */}
        <div className="w-full md:w-72 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl flex flex-col overflow-hidden shadow-sm shrink-0">
          <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-black/5">
            <h2 className="font-semibold text-[var(--text-primary)] font-display">Conversas</h2>
            <button onClick={handleNewConversation} className="p-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            {conversations.map(conv => (
              <div 
                key={conv.id} 
                onClick={() => setActiveConversationId(conv.id)}
                className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group transition-all duration-200 ${activeConversationId === conv.id ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'hover:bg-white/5 border border-transparent text-[var(--text-secondary)]'}`}
              >
                <div className="truncate text-sm flex-1 mr-2 font-medium">{conv.title || 'Nova Conversa'}</div>
                <button 
                  onClick={(e) => handleDeleteConversation(conv.id, e)} 
                  className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${activeConversationId === conv.id ? 'hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'hover:bg-black/20 text-[var(--color-accent-danger)]'}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-center p-6 text-sm text-[var(--text-tertiary)] flex flex-col items-center gap-2">
                <Bot size={24} className="opacity-40" />
                Nenhuma conversa salva
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl flex flex-col relative overflow-hidden shadow-sm">
          
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3 bg-black/5">
             <div className="w-8 h-8 rounded-full bg-[var(--color-accent-blue)]/20 flex items-center justify-center text-[var(--color-accent-blue)]">
               <Bot size={18} />
             </div>
             <div>
               <h3 className="font-semibold text-sm">Oficina IA</h3>
               <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-teal)]"></span>
                 MCP Integrado
               </p>
             </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
             {messages.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] opacity-60">
                 <Bot size={48} className="mb-4 text-[var(--color-primary)]" />
                 <h2 className="text-xl font-display font-medium text-[var(--text-primary)]">Como posso ajudar?</h2>
                 <p className="mt-2 text-sm text-center max-w-sm">Conectado aos sistemas locais da sua oficina. Pergunte sobre CMV, Contas a Pagar, ou Ordens de Serviço.</p>
               </div>
             )}
             <MessageList messages={messages} isLoading={isLoading} />
             <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="max-w-4xl mx-auto">
              <PromptBox 
                onSubmitMessage={sendMessage} 
                isSending={isLoading}
              />
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}

