import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/components/chat/MessageList';
import { InlineDecisionProposal } from '@/components/conciliacao/chat/InlineDecisionCard';

export interface UseReconciliationChatProps {
  targetDate: string;
  initialConversationId?: string;
}

export function useReconciliationChat({
  targetDate,
  initialConversationId
}: UseReconciliationChatProps) {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeProposal, setActiveProposal] = useState<InlineDecisionProposal | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  // 1. Carregar ou criar conversa para o targetDate
  const initConversation = useCallback(async () => {
    if (!targetDate || isInitializingRef.current) return;
    isInitializingRef.current = true;
    setIsLoading(true);

    try {
      // Tentar encontrar conversa existente para a data
      let currentCid = conversationId;

      if (!currentCid) {
        const { data: convs, error: convErr } = await (supabase as any)
          .from('conversations')
          .select('id, metadata')
          .eq('target_date', targetDate)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!convErr && convs && convs.length > 0) {
          currentCid = convs[0].id;
          setConversationId(currentCid);
        } else {
          // Criar nova conversa vinculada à data
          const { data: newConv, error: createErr } = await (supabase as any)
            .from('conversations')
            .insert({
              target_date: targetDate,
              title: `Conciliação ${targetDate}`,
              status: 'active',
              metadata: { module: 'conciliacao' }
            })
            .select('id')
            .single();

          if (!createErr && newConv) {
            currentCid = newConv.id;
            setConversationId(currentCid);
          }
        }
      }

      // Se temos conversa, carregar as mensagens
      if (currentCid) {
        const { data: loadedMsgs, error: msgErr } = await (supabase as any)
          .from('messages')
          .select('*')
          .eq('conversation_id', currentCid)
          .order('created_at', { ascending: true });

        if (!msgErr && loadedMsgs && loadedMsgs.length > 0) {
          const parsedMessages: Message[] = loadedMsgs.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content || '',
            toolInvocations: m.tool_invocations || [],
            parts: m.parts || [],
            proposal: m.parts?.find((p: any) => p.type === 'proposal')?.proposal || null
          }));
          setMessages(parsedMessages);
          setIsLoading(false);
          isInitializingRef.current = false;
          return;
        }
      }

      // Se for a primeira inicialização sem mensagens, gerar boas-vindas com dados canônicos
      const { data: summaryData } = await (supabase as any).rpc('get_daily_reconciliation_summary', {
        p_date: targetDate,
        p_force_dynamic: true
      });

      const summary = (summaryData as any) || {};
      const formatBrl = (v?: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

      const welcomeText = `**Relatório de Auditoria — Fechamento ${targetDate}**\n\n` +
        `O motor de conciliação consolidou os saldos do PostgreSQL:\n` +
        `- **Caixa Atual:** ${formatBrl(summary.caixa_atual)}\n` +
        `- **Faturamento do Período:** ${formatBrl(summary.faturamento_periodo)}\n` +
        `- **Subtotal de Contas:** ${formatBrl(summary.subtotal_contas)}\n` +
        `- **Diferença Final (Δ):** ${formatBrl(summary.diferenca_final)} (${summary.status_geral === 'approved' ? 'Aprovado / Em Conformidade' : 'Divergente'})\n\n` +
        `Os 6 braços especialistas da Hydra estão prontos para investigar divergências por filial, despesas não provisionadas ou cruzamento de pátio.\n\n` +
        `*Dica: Você pode usar comandos diretos como \`/auto-match\`, \`/lojas\` ou perguntar sobre filiais específicas.*`;

      const initialMessage: Message = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: welcomeText
      };

      setMessages([initialMessage]);

      // Salvar mensagem inicial no banco se temos currentCid
      if (currentCid) {
        await (supabase as any).from('messages').insert({
          conversation_id: currentCid,
          role: 'assistant',
          content: welcomeText
        });
      }
    } catch (err) {
      console.error('Erro ao inicializar chat de conciliação:', err);
    } finally {
      setIsLoading(false);
      isInitializingRef.current = false;
    }
  }, [targetDate, conversationId]);

  useEffect(() => {
    initConversation();
  }, [initConversation]);

  // 2. Enviar Mensagem do Usuário e Orquestrar Resposta da Hydra
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userText = text.trim();
      const userMessageId = `user-${Date.now()}`;
      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        content: userText
      };

      // Atualizar UI otimista
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Persistir mensagem do usuário se houver conversa
      if (conversationId) {
        await (supabase as any).from('messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: userText
        });
      }

      // TRATAMENTO DE COMANDOS DIRETOS (Rápida execução sem latência de LLM)
      if (userText.startsWith('/')) {
        const [cmd, ...args] = userText.split(' ');
        const normalizedCmd = cmd.toLowerCase();

        if (normalizedCmd === '/auto-match') {
          try {
            const { data: matchResult, error: matchErr } = await (supabase as any).rpc('auto_match_daily_transactions', {
              p_date: targetDate
            });

            if (matchErr) throw matchErr;
            const res = matchResult as any;

            const report = `**Resultado do Auto-Match Determinístico:**\n\n` +
              `- Recebimentos PIX vinculados a OS: **${res?.pix_matched || 0}**\n` +
              `- Vendas de Maquininhas Rede vinculadas: **${res?.pos_matched || 0}**\n` +
              `- Colisões de mesmo valor evitadas: **${res?.collisions_prevented || 0}**\n` +
              `- Transações corporativas tagueadas: **${res?.corporate_tagged || 0}**\n\n` +
              `O saldo foi recalculado no PostgreSQL. Verifique o placar superior.`;

            const replyMsg: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: report
            };

            setMessages((prev) => [...prev, replyMsg]);
            if (conversationId) {
              await (supabase as any).from('messages').insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: report
              });
            }

            // Invalida cache de dados
            queryClient.invalidateQueries({ queryKey: ['dailyReconciliationSummary', targetDate] });
          } catch (err: any) {
            const errorMsg: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: `Falha ao executar auto-match: ${err.message || 'Erro no banco de dados'}`
            };
            setMessages((prev) => [...prev, errorMsg]);
          } finally {
            setIsLoading(false);
          }
          return;
        }

        if (normalizedCmd === '/lojas' || normalizedCmd === '/status') {
          try {
            const { data: summaryData } = await (supabase as any).rpc('get_daily_reconciliation_summary', {
              p_date: targetDate,
              p_force_dynamic: true
            });

            const summary = (summaryData as any) || {};
            const stores = summary.stores || summary.stores_detail || [];

            let storeReport = `**Diagnóstico das 10 Filiais (${targetDate}):**\n\n| Filial | Saldo Banco | Entradas | Saídas | Diferença |\n| :--- | :--- | :--- | :--- | :--- |\n`;

            const formatBrl = (v?: number) =>
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

            stores.forEach((st: any) => {
              storeReport += `| ${st.name || st.store_id} | ${formatBrl(st.saldo_banco)} | ${formatBrl(st.entradas_conciliadas)} | ${formatBrl(st.contas_conciliadas)} | ${formatBrl(st.dif_entradas - st.dif_saidas)} |\n`;
            });

            const replyMsg: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: storeReport
            };

            setMessages((prev) => [...prev, replyMsg]);
            if (conversationId) {
              await (supabase as any).from('messages').insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: storeReport
              });
            }
          } catch (err: any) {
            console.error(err);
          } finally {
            setIsLoading(false);
          }
          return;
        }
      }

      // DISPARO PARA A EDGE FUNCTION AI-CHAT (Com fallback resiliente)
      try {
        const { data: aiResponse, error: aiErr } = await supabase.functions.invoke('ai-chat', {
          body: {
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content
            })),
            target_date: targetDate,
            context_module: 'conciliacao',
            conversation_id: conversationId
          }
        });

        if (aiErr || !aiResponse) {
          // Fallback analítico determinístico inteligente caso a edge function não responda
          const { data: summaryData } = await (supabase as any).rpc('get_daily_reconciliation_summary', {
            p_date: targetDate,
            p_force_dynamic: true
          });
          const sum = (summaryData as any) || {};
          const fallbackText = `Compreendi a solicitação referente ao fechamento de ${targetDate}.\n\n` +
            `O Delta consolidado atual é de **R$ ${Number(sum.diferenca_final || 0).toFixed(2)}**.\n` +
            `Todas as operações de batimento podem ser acionadas via \`/auto-match\` ou comandos diretos.`;

          const fallbackMsg: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: fallbackText
          };

          setMessages((prev) => [...prev, fallbackMsg]);
          if (conversationId) {
            await (supabase as any).from('messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: fallbackText
            });
          }
        } else {
          // Processa a resposta estruturada ou texto retornado
          const assistantReplyText = typeof aiResponse === 'string' ? aiResponse : (aiResponse.text || JSON.stringify(aiResponse));
          const replyMsg: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: assistantReplyText,
            toolInvocations: aiResponse.toolInvocations || [],
            proposal: aiResponse.proposal || null
          };

          setMessages((prev) => [...prev, replyMsg]);
        }
      } catch (err: any) {
        console.error('Erro na chamada da IA:', err);
        const errorMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Houve uma intercorrência ao consultar a inteligência contábil: ${err.message || 'Tempo limite excedido'}. Você pode continuar utilizando os comandos operacionais normais.`
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [targetDate, conversationId, messages, isLoading, queryClient]
  );

  // 3. Confirmar Proposta Inline (Executa RPC resolve_orphan_transaction)
  const confirmProposal = useCallback(
    async (proposal: InlineDecisionProposal) => {
      setIsLoading(true);
      try {
        const { data: res, error: rpcErr } = await (supabase as any).rpc('resolve_orphan_transaction', {
          p_tx_id: proposal.actionPayload.transactionId,
          p_action: proposal.actionPayload.actionType,
          p_params: {
            store_id: proposal.storeId,
            os_number: proposal.actionPayload.targetId,
            amount: proposal.amount,
            category: proposal.actionPayload.category,
            justification: proposal.actionPayload.justification
          }
        });

        if (rpcErr) throw rpcErr;

        // Atualizar estado da proposta para 'confirmed'
        setMessages((prev) =>
          prev.map((m) => {
            if (m.proposal && m.proposal.id === proposal.id) {
              return {
                ...m,
                proposal: { ...m.proposal, status: 'confirmed' }
              };
            }
            return m;
          })
        );

        // Feedback do assistente no feed
        const confirmMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Ação confirmada e homologada no PostgreSQL. A transação foi regularizada com sucesso e os 5 Pilares foram recalculados.`
        };

        setMessages((prev) => [...prev, confirmMsg]);

        // Invalida cache para atualizar os 5 Pilares no topo
        queryClient.invalidateQueries({ queryKey: ['dailyReconciliationSummary', targetDate] });
      } catch (err: any) {
        console.error('Erro ao confirmar proposta:', err);
        const failMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Não foi possível aplicar a resolução no banco: ${err.message}`
        };
        setMessages((prev) => [...prev, failMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [targetDate, queryClient]
  );

  // 4. Rejeitar Proposta Inline
  const rejectProposal = useCallback((proposal: InlineDecisionProposal) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.proposal && m.proposal.id === proposal.id) {
          return {
            ...m,
            proposal: { ...m.proposal, status: 'rejected' }
          };
        }
        return m;
      })
    );

    const rejectMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: `A proposta foi rejeitada pelo operador. Nenhuma alteração foi persistida no banco.`
    };
    setMessages((prev) => [...prev, rejectMsg]);
  }, []);

  return {
    conversationId,
    messages,
    isLoading,
    sendMessage,
    confirmProposal,
    rejectProposal
  };
}
