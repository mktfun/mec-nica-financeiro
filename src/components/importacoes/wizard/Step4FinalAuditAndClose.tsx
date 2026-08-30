import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { CentralImportResults } from '@/lib/parsers/centralImportManager';
import { useAiSettings } from '@/hooks/useAiSettings';
import { reconcileRedeWithOfxViaGemini } from '@/lib/llm-matcher';
import { useDailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

interface MissingPatioOsEdit {
  id: string;
  os_number: string;
  plate: string;
  store_id: string;
  store_name: string;
  original_total_value: number;
  original_paid_value: number;
  original_status: string;
  total_value: number;
  paid_value: number;
  status: string;
  opened_at?: string;
  days_open?: number;
}

interface Props {
  results: CentralImportResults;
  mapping: Record<string, string>;
  targetDate: string;
  stores: { id: string; name: string }[];
  manualInputs: {
    odometroHoje: number;
    manualDinheiroMp: number;
    manualAReceber: number;
    contasManual: number;
  };
  missingOsList: MissingPatioOsEdit[];
  isSaving: boolean;
  onFinish: () => void;
  onBack: () => void;
}

export function Step4FinalAuditAndClose({
  results,
  mapping,
  targetDate,
  stores,
  manualInputs,
  missingOsList,
  isSaving,
  onFinish,
  onBack,
}: Props) {
  const { data: summary, refetch, isLoading } = useDailyReconciliationSummary(targetDate);
  const { data: aiSettings } = useAiSettings();

  const [runningAi, setRunningAi] = useState(false);

  // Dispara matcher IA usando gemini-3.5-flash-lite
  const handleRunAiMatcher = async () => {
    setRunningAi(true);
    try {
      toast.info('Iniciando reconciliador com Gemini 3.5 Flash Lite...');

      const summaryStores = (summary as any)?.stores || [];
      let totalResolved = 0;

      for (const store of summaryStores) {
        if (store.status !== 'approved' && store.diferenca !== 0) {
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
              dateVenda: p.sale_date || targetDate,
            }));

            const ofxCredits = ofxTx.map((o: any) => ({
              id: o.id,
              fitid: o.fitid,
              title: o.counterpart_name || o.title || 'Crédito',
              amount: Number(o.amount || 0),
              date: o.date,
            }));

            const res = await reconcileRedeWithOfxViaGemini(
              store.store_id,
              store.store_name,
              targetDate,
              redeSales,
              ofxCredits,
              aiSettings?.api_key,
              'gemini-3.5-flash-lite'
            );

            if (res.salesStatus && res.salesStatus.length > 0) {
              totalResolved += res.salesStatus.filter(s => s.status === 'entrou').length;
            }
          }
        }
      }

      await refetch();
      toast.success(
        `Matcher IA concluído! ${totalResolved} vendas sincronizadas via Gemini 3.5 Flash Lite.`
      );
    } catch (err: any) {
      console.error('Erro no matcher IA:', err);
      toast.error(`Falha no matcher IA: ${err.message}`);
    } finally {
      setRunningAi(false);
    }
  };

  const diferenca = (summary as any)?.diferenca_final ?? 0;
  const isOk = Math.abs(diferenca) <= 50;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-5 bg-zinc-950 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" size={20} />
              Tela D: Auditoria Final &amp; Fechamento Consolidado
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Confira a consolidação dos 5 pilares apurados pelo banco de dados. Execute o
              reconciliador IA se restarem divergências e efetue o fechamento definitivo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={runningAi || isLoading}
              onClick={() => refetch()}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs cursor-pointer border border-zinc-700"
            >
              <RefreshCw size={12} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              size="sm"
              variant="secondary"
              disabled={runningAi}
              onClick={handleRunAiMatcher}
              className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold cursor-pointer shrink-0"
            >
              <Sparkles size={14} className="mr-1.5 text-purple-400" />
              {runningAi ? (
                <>
                  <Loader2 size={12} className="animate-spin mr-1" />
                  Processando Gemini...
                </>
              ) : (
                'Analisar com IA'
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Cards dos 5 pilares */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card className="p-4 bg-zinc-950 border-l-4 border-l-cyan-500 border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            1. Saldo Bancos + Cofre
          </span>
          <p className="text-lg font-bold font-mono text-cyan-400 mt-1">
            <AmountCell value={(summary as any)?.total_saldo_banco || 0} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-950 border-l-4 border-l-emerald-500 border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            2. Dinheiro MP
          </span>
          <p className="text-lg font-bold font-mono text-emerald-400 mt-1">
            <AmountCell value={(summary as any)?.dinheiro_mp || manualInputs.manualDinheiroMp} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-950 border-l-4 border-l-blue-500 border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            3. A Receber
          </span>
          <p className="text-lg font-bold font-mono text-blue-400 mt-1">
            <AmountCell value={(summary as any)?.a_receber_manual || manualInputs.manualAReceber} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-950 border-l-4 border-l-amber-500 border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            4. Na Loja OS (Pátio)
          </span>
          <p className="text-lg font-bold font-mono text-amber-400 mt-1">
            <AmountCell value={(summary as any)?.na_loja_os || 0} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-950 border-l-4 border-l-purple-500 border-zinc-800 col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            5. Faturamento do Dia
          </span>
          <p className="text-lg font-bold font-mono text-purple-400 mt-1">
            <AmountCell value={(summary as any)?.faturamento || 0} />
          </p>
        </Card>
      </div>

      {/* Semáforo */}
      <Card
        className={`p-6 border-2 ${
          isOk ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {isOk ? (
                <CheckCircle2 size={18} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={18} className="text-rose-400" />
              )}
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isOk ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isOk
                  ? '✓ Fechamento em Conformidade Contábil'
                  : '⚠ Divergência Acima da Tolerância (pode prosseguir com override)'}
              </span>
              <Badge
                variant={isOk ? 'success' : 'danger'}
                dot
                className="text-[10px] font-mono"
              >
                Tolerância ± R$ 50,00
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Diferença entre Valor Disponível de Contas e Subtotal a Cobrir.
            </p>

            {!isOk && (
              <p className="text-xs text-amber-400 font-semibold mt-1">
                Atenção: botão habilitado para override manual. Confirme somente se tiver certeza.
              </p>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right font-mono">
              <span className="text-[10px] text-zinc-500 uppercase block">Diferença Final</span>
              <p
                className={`text-3xl font-bold ${isOk ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                R$ {diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Navegação */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="secondary"
          onClick={onBack}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          Voltar
        </Button>

        <Button
          onClick={onFinish}
          disabled={isSaving}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer text-sm shrink-0"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Gravando...
            </>
          ) : (
            <>
              <Lock size={16} />
              Confirmar e Gravar Importação
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
