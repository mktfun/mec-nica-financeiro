import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
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
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-[calc(100vh-140px)] flex flex-col md:flex-row bg-[var(--bg-surface)] rounded-3xl overflow-hidden shadow-sm border border-[var(--border-subtle)]/50">
        
        {/* Sidebar Histórico (Minimalista) */}
        <div className="w-full md:w-[260px] bg-transparent border-r border-[var(--border-subtle)] flex flex-col overflow-hidden shrink-0 pt-4">
          <div className="px-4 pb-4">
            <button 
              onClick={handleNewConversation} 
              className="w-full bg-[var(--text-primary)] text-[var(--bg-canvas)] rounded-full py-2.5 px-4 flex items-center justify-between font-medium text-sm hover:bg-[var(--text-secondary)] transition-colors shadow-sm"
            >
              <span>New Chat</span>
              <Plus size={16} />
            </button>
          </div>
          
          <div className="px-4 pb-2">
            <div className="text-[11px] font-semibold tracking-wider text-[var(--text-tertiary)] uppercase mb-2">History</div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar pb-4">
            {conversations.map(conv => (
              <div 
                key={conv.id} 
                onClick={() => setActiveConversationId(conv.id)}
                className={`px-3 py-2.5 rounded-lg cursor-pointer flex justify-between items-center group transition-all duration-200 ${activeConversationId === conv.id ? 'bg-[var(--bg-surface-elevated)] font-medium text-[var(--text-primary)]' : 'hover:bg-black/5 text-[var(--text-secondary)]'}`}
              >
                <div className="truncate text-[13px] flex-1 mr-2">{conv.title || 'Nova Conversa'}</div>
                <button 
                  onClick={(e) => handleDeleteConversation(conv.id, e)} 
                  className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${activeConversationId === conv.id ? 'text-[var(--text-secondary)] hover:text-[var(--color-accent-danger)]' : 'text-[var(--text-tertiary)] hover:text-[var(--color-accent-danger)]'}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-center p-6 text-sm text-[var(--text-tertiary)] flex flex-col items-center gap-2">
                Nenhuma conversa
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 bg-transparent flex flex-col relative overflow-hidden">
          
          {/* Header Minimalista */}
          <div className="px-6 py-4 flex justify-between items-center z-10 bg-gradient-to-b from-[var(--bg-surface)] to-transparent">
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white shadow-sm">
                 <Bot size={16} />
               </div>
               <div>
                 <h3 className="font-semibold text-sm">Oficina GPT <span className="ml-1 text-[10px] bg-[var(--bg-surface-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)]">Plus</span></h3>
               </div>
             </div>
             
             <div className="flex items-center gap-2">
                <button className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] transition-colors">Configuration ⚙️</button>
                <button className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] transition-colors">Share ↗</button>
             </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-16 pt-2 pb-32 custom-scrollbar relative">
             {messages.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] opacity-60">
                 <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-500/20">
                    <Bot size={32} />
                 </div>
                 <h2 className="text-2xl font-display font-medium text-[var(--text-primary)]">Como posso ajudar?</h2>
                 <p className="mt-2 text-sm text-center max-w-md">Conectado aos sistemas locais da sua oficina. Pergunte sobre CMV, Contas a Pagar, ou Ordens de Serviço.</p>
               </div>
             )}
             <MessageList messages={messages} isLoading={isLoading} />
             <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area (Flutuante) */}
          <div className="absolute bottom-6 left-0 right-0 px-4 md:px-16 pointer-events-none">
            <div className="max-w-3xl mx-auto pointer-events-auto">
              <PromptBox 
                onSubmitMessage={sendMessage} 
                isSending={isLoading}
              />
            </div>
            {/* Disclaimer */}
            <div className="text-center mt-3 text-[10px] text-[var(--text-tertiary)]">
              A IA pode cometer erros. Verifique informações importantes. <span className="underline cursor-pointer">Sua Privacidade & Oficina GPT</span>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}

