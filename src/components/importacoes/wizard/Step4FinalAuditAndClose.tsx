import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { useDailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { useAiSettings } from '@/hooks/useAiSettings';
import { reconcileRedeWithOfxViaGemini } from '@/lib/llm-matcher';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface Step4FinalAuditAndCloseProps {
  targetDate: string;
  onFinished: () => void;
}

export function Step4FinalAuditAndClose({
  targetDate,
  onFinished
}: Step4FinalAuditAndCloseProps) {
  const navigate = useNavigate();
  const { data: summary, refetch, isLoading } = useDailyReconciliationSummary(targetDate);
  const { data: aiSettings } = useAiSettings();

  const [runningAi, setRunningAi] = useState(false);
  const [closingDay, setClosingDay] = useState(false);

  // Dispara matcher assistido por IA usando estritamente gemini-3.5-flash-lite
  const handleRunAiMatcher = async () => {
    setRunningAi(true);
    try {
      toast.info('Iniciando reconciliador com Gemini 3.5 Flash Lite...');

      // Executa reconciliação assistida para as filiais com divergência residual
      const stores = summary?.stores || [];
      let totalResolved = 0;

      for (const store of stores) {
        if (store.status !== 'approved' && store.diferenca !== 0) {
          // Busca transações daquela filial
          const { data: posTx } = await supabase
            .from('pos_transactions')
            .select('*')
            .eq('store_id', store.store_id)
            .eq('target_date', targetDate);

          const { data: ofxTx } = await supabase
            .from('ofx_transactions')
            .select('*')
            .eq('store_id', store.store_id)
            .eq('date', targetDate);

          if (posTx && posTx.length > 0 && ofxTx && ofxTx.length > 0) {
            const redeSales = posTx.map((p: any) => ({
              id: p.id,
              grossAmount: Number(p.gross_amount || p.amount || 0),
              feeAmount: Number(p.fee_amount || 0),
              netAmount: Number(p.net_amount || p.amount || 0),
              method: p.brand || p.method || 'rede',
              dateVenda: p.sale_date || targetDate
            }));

            const ofxCredits = ofxTx.map((o: any) => ({
              id: o.id,
              fitid: o.fitid,
              title: o.counterpart_name || o.title || 'Crédito',
              amount: Number(o.amount || 0),
              date: o.date
            }));

            const res = await reconcileRedeWithOfxViaGemini(
              store.store_id,
              store.store_name,
              targetDate,
              redeSales,
              ofxCredits,
              aiSettings?.api_key,
              'gemini-3.5-flash-lite' // Modelo canônico obrigatório
            );

            if (res.salesStatus && res.salesStatus.length > 0) {
              totalResolved += res.salesStatus.filter(s => s.status === 'entrou').length;
            }
          }
        }
      }

      await refetch();
      toast.success(`Matcher IA concluído! ${totalResolved} vendas sincronizadas via Gemini 3.5 Flash Lite.`);
    } catch (err: any) {
      console.error('Erro no matcher IA:', err);
      toast.error(`Falha no matcher IA: ${err.message}`);
    } finally {
      setRunningAi(false);
    }
  };

  // Fechamento definitivo com gravação de snapshot
  const handleCloseDay = async () => {
    setClosingDay(true);
    try {
      // 1. Grava snapshot fechado no Supabase
      const { error } = await supabase
        .from('daily_snapshots')
        .upsert({
          date: targetDate,
          is_closed: true,
          faturamento: summary?.faturamento || 0,
          saldo_bancario: summary?.total_saldo_banco || 0,
          dinheiro_mp: summary?.dinheiro_mp || 0,
          a_receber_manual: summary?.a_receber_manual || 0,
          contas_a_pagar: summary?.contas_base || 0,
          metadata: {
            closed_at: new Date().toISOString(),
            closed_by: 'operador_wizard',
            diferenca_final: summary?.diferenca_final || 0,
            status_geral: summary?.status_geral || 'approved'
          }
        }, { onConflict: 'date' });

      if (error) throw error;

      toast.success('Dia fechado e blindado com sucesso!');
      onFinished();
      navigate({ to: '/conciliacao', search: { date: targetDate } });
    } catch (err: any) {
      console.error('Erro ao fechar dia:', err);
      toast.error(`Falha ao fechar o dia: ${err.message}`);
    } finally {
      setClosingDay(false);
    }
  };

  const diferenca = summary?.diferenca_final ?? 0;
  const isOk = Math.abs(diferenca) <= 50;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-5 bg-zinc-900/60 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" size={20} />
              Passo 4: Auditoria Final & Fechamento Consolidado
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Confira a consolidação dos 5 pilares apurados diretamente pelo PostgreSQL. Execute o reconciliador assistido por IA se restarem divergências e efetue o fechamento definitivo blindado.
            </p>
          </div>

          <Button
            size="sm"
            variant="secondary"
            disabled={runningAi}
            onClick={handleRunAiMatcher}
            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold cursor-pointer shrink-0"
          >
            <Sparkles size={14} className="mr-1.5 text-purple-400" />
            {runningAi ? 'Processando Gemini...' : 'Executar IA (Gemini 3.5 Flash Lite)'}
          </Button>
        </div>
      </Card>

      {/* Cards dos 5 Pilares Contábeis Consolidados */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card className="p-4 bg-zinc-900/40 border-l-4 border-l-cyan-500">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">1. Saldo Bancos + Cofre</span>
          <p className="text-lg font-bold font-mono text-cyan-400 mt-1">
            <AmountCell value={summary?.total_saldo_banco || 0} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-900/40 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">2. Dinheiro MP</span>
          <p className="text-lg font-bold font-mono text-emerald-400 mt-1">
            <AmountCell value={summary?.dinheiro_mp || 0} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-900/40 border-l-4 border-l-blue-500">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">3. A Receber</span>
          <p className="text-lg font-bold font-mono text-blue-400 mt-1">
            <AmountCell value={summary?.a_receber_manual || 0} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-900/40 border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">4. Na Loja OS (Pátio)</span>
          <p className="text-lg font-bold font-mono text-amber-400 mt-1">
            <AmountCell value={summary?.na_loja_os || 0} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-900/40 border-l-4 border-l-purple-500 col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">5. Faturamento do Dia</span>
          <p className="text-lg font-bold font-mono text-purple-400 mt-1">
            <AmountCell value={summary?.faturamento || 0} />
          </p>
        </Card>
      </div>

      {/* Hero da Diferença Final & Semáforo */}
      <Card className={`p-6 border-2 ${isOk ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${isOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isOk ? '✓ Fechamento em Conformidade Contábil' : '⚠ Divergência Residual Acima da Tolerância'}
              </span>
              <Badge variant={isOk ? 'success' : 'danger'} dot className="text-[10px] font-mono">
                Tolerância ± R$ 50,00
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Diferença apurada entre Valor Disponível de Contas e Subtotal de Contas a Cobrir.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right font-mono">
              <span className="text-[10px] text-zinc-500 uppercase block">Diferença Final</span>
              <p className={`text-3xl font-bold ${isOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                R$ {diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <Button
              onClick={handleCloseDay}
              disabled={closingDay}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer text-sm shrink-0"
            >
              <Lock size={16} />
              {closingDay ? 'Fechando Dia...' : 'Salvar & Fechar Dia'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
