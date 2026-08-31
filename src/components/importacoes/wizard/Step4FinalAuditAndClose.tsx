import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { CentralImportResults } from '@/lib/parsers/centralImportManager';
import { useAiSettings } from '@/hooks/useAiSettings';
import { reconcileRedeWithOfxViaGemini } from '@/lib/llm-matcher';
import { useDailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { usePreviousDaySnapshot } from '@/hooks/useDailySnapshot';
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
  Calculator,
  ArrowRight,
} from 'lucide-react';

export interface MissingPatioOsEdit {
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

export interface Step4FinalAuditAndCloseProps {
  results?: CentralImportResults;
  mapping?: Record<string, string>;
  targetDate: string;
  stores?: { id: string; name: string }[];
  manualInputs?: {
    odometroHoje: number;
    manualDinheiroMp: number;
    manualAReceber: number;
    contasManual: number;
  };
  missingOsList?: MissingPatioOsEdit[];
  isSaving: boolean;
  onFinish: () => void;
  onBack: () => void;
}

export function Step4FinalAuditAndClose({
  results,
  mapping,
  targetDate,
  stores = [],
  manualInputs = { odometroHoje: 0, manualDinheiroMp: 0, manualAReceber: 0, contasManual: 0 },
  missingOsList = [],
  isSaving,
  onFinish,
  onBack,
}: Step4FinalAuditAndCloseProps) {
  const { data: summary, refetch, isLoading, isRefetching } = useDailyReconciliationSummary(targetDate);
  const { data: previousSnapshot } = usePreviousDaySnapshot(targetDate);
  const { data: aiSettings } = useAiSettings();

  const [runningAi, setRunningAi] = useState(false);

  // -------------------------------------------------------------
  // CÁLCULO CANÔNICO DOS 5 PILARES & DRE DO WIZARD
  // Prioriza o summary retornado pela RPC do Supabase se disponível;
  // Faz fallback gracioso para os cálculos em memória do wizard.
  // -------------------------------------------------------------
  const {
    totalSaldoBanco,
    saldoBancosPositivo,
    saldoNegativoItau,
    dinheiroMp,
    aReceber,
    naLojaOs,
    faturamentoDia,
    fatAnterior,
    faturamentoPeriodo,
    caixaAtual,
    caixaAnterior,
    fluxoCaixa,
    valorDispContas,
    jurosRede,
    contasFinal,
    subtotalContas,
    diferencaFinal,
    isOk,
    isWarning,
  } = useMemo(() => {
    if (summary && summary.caixa_atual !== undefined && summary.caixa_atual !== null) {
      const dif = Number(summary.diferenca_final || 0);
      const absDif = Math.abs(dif);
      return {
        totalSaldoBanco: Number(summary.total_saldo_banco_positivo ?? summary.total_saldo_banco ?? 0),
        saldoBancosPositivo: Number(summary.total_saldo_banco_positivo ?? summary.saldo_bancos_positivo ?? summary.total_saldo_banco ?? 0),
        saldoNegativoItau: Number(summary.total_saldo_banco_negativo ?? summary.saldo_negativo_itau ?? 0),
        dinheiroMp: Number(summary.dinheiro_mp ?? manualInputs.manualDinheiroMp ?? 0),
        aReceber: Number(summary.a_receber ?? manualInputs.manualAReceber ?? 0),
        naLojaOs: Number(summary.na_loja_os ?? 0),
        faturamentoDia: Number(summary.faturamento_periodo ?? summary.faturamento_oi_base ?? 0),
        fatAnterior: Number(summary.faturamento_anterior ?? 0),
        faturamentoPeriodo: Number(summary.faturamento_periodo ?? 0),
        caixaAtual: Number(summary.caixa_atual ?? 0),
        caixaAnterior: Number(summary.caixa_anterior ?? 0),
        fluxoCaixa: Number(summary.fluxo_caixa ?? 0),
        valorDispContas: Number(summary.valor_disp_contas ?? 0),
        jurosRede: Number(summary.juros_rede ?? 0),
        contasFinal: Number(summary.contas_manual ?? 0),
        subtotalContas: Number(summary.subtotal_contas ?? 0),
        diferencaFinal: dif,
        isOk: absDif <= 50.0,
        isWarning: absDif > 50.0 && absDif <= 200.0,
      };
    }

    // 1. Pilar 1: Saldo Bancos OFX
    let saldoPos = 0;
    let saldoNeg = 0;
    (results?.ofxResults || []).forEach((ofx) => {
      const bal = typeof ofx.bankBalance === 'number' ? ofx.bankBalance : 0;
      if (bal < 0) saldoNeg += Math.abs(bal);
      else saldoPos += bal;
    });
    const totalBanco = saldoPos - saldoNeg;

    // 2. Pilar 2: Dinheiro MP
    const mp = manualInputs.manualDinheiroMp || 0;

    // 3. Pilar 3: A Receber
    const rec = manualInputs.manualAReceber || 0;

    // 4. Pilar 4: Na Loja OS (Pátio)
    let patioSum = 0;
    (results?.osFiles || [])
      .filter((r) => r.success)
      .forEach((f) => {
        (f.osArray || []).forEach((os) => {
          const st = String(os.status || '').toLowerCase();
          const isPendente =
            st.includes('em_aberto') ||
            st.includes('pago_parcial') ||
            st.includes('em_andamento') ||
            st === 'aberta' ||
            st === 'aberto' ||
            st === 'pendente';
          if (isPendente) {
            patioSum += Math.max(0, (Number(os.total_value) || 0) - (Number(os.paid_value) || 0));
          }
        });
      });

    (missingOsList || []).forEach((m) => {
      const st = String(m.status || '').toLowerCase();
      const isPendente =
        st.includes('em_aberto') ||
        st.includes('pago_parcial') ||
        st.includes('em_andamento') ||
        st === 'aberta' ||
        st === 'aberto' ||
        st === 'pendente';
      if (isPendente) {
        patioSum += Math.max(0, (Number(m.total_value) || 0) - (Number(m.paid_value) || 0));
      }
    });

    const finalPatio = patioSum > 0 ? patioSum : Number((summary as any)?.na_loja_os || 0);

    // 5. Pilar 5: Faturamento
    const fatAnteriorVal = Number(
      (previousSnapshot?.metadata as any)?.odometro_hoje ??
      (previousSnapshot?.metadata as any)?.faturamento_anterior ??
      (previousSnapshot?.metadata as any)?.odometro_anterior ??
      previousSnapshot?.faturamento ??
      0
    );
    let fatBase = 0;
    if (manualInputs.odometroHoje > 0) {
      if (fatAnteriorVal > 0 && manualInputs.odometroHoje >= fatAnteriorVal) {
        fatBase = manualInputs.odometroHoje - fatAnteriorVal;
      } else {
        fatBase = manualInputs.odometroHoje;
      }
    } else {
      (results?.osFiles || [])
        .filter((r) => r.success)
        .forEach((f) => {
          (f.osArray || []).forEach((os) => {
            const p = Number(os.paid_value) || 0;
            if (p > 0) fatBase += p;
          });
        });
    }

    const fatPeriodo = fatBase;

    // DRE & Semáforo
    const cAtual = (saldoPos + mp + rec + finalPatio) - saldoNeg;
    const cAnterior = Number(previousSnapshot?.caixa_atual || 0);
    const flx = cAtual - cAnterior;
    const vDisp = fatPeriodo - flx;

    const juros = (results?.redeResults || [])
      .filter((r) => r.success)
      .reduce((acc, r) => {
        return (
          acc +
          (r.transactions || []).reduce((s, t) => s + (Number(t.interest) || 0), 0)
        );
      }, 0);

    const contasImportadas =
      (results?.contasPagarResults || []).reduce(
        (acc, c) => acc + (Number(c.totalAmount) || 0),
        0
      ) || 0;
    const contas = manualInputs.contasManual > 0 ? manualInputs.contasManual : contasImportadas;
    const subtotal = contas + juros;
    const dif = vDisp - subtotal;
    const absDif = Math.abs(dif);

    return {
      totalSaldoBanco: totalBanco,
      saldoBancosPositivo: saldoPos,
      saldoNegativoItau: saldoNeg,
      dinheiroMp: mp,
      aReceber: rec,
      naLojaOs: finalPatio,
      faturamentoDia: fatBase,
      fatAnterior: fatAnteriorVal,
      faturamentoPeriodo: fatPeriodo,
      caixaAtual: cAtual,
      caixaAnterior: cAnterior,
      fluxoCaixa: flx,
      valorDispContas: vDisp,
      jurosRede: juros,
      contasFinal: contas,
      subtotalContas: subtotal,
      diferencaFinal: dif,
      isOk: absDif <= 50.0,
      isWarning: absDif > 50.0 && absDif <= 200.0,
    };
  }, [results, manualInputs, missingOsList, previousSnapshot, summary]);

  const handleManualRefresh = async () => {
    try {
      await refetch();
      toast.success('Diferença e 5 pilares recalculados com o banco!');
    } catch (err: any) {
      toast.error(`Erro ao recalcular: ${err.message}`);
    }
  };

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
              totalResolved += res.salesStatus.filter((s) => s.status === 'entrou').length;
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

  return (
    <div className="space-y-6">
      {/* Header com Instrução Clara e Botões de Recálculo */}
      <Card className="p-5 bg-zinc-900 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" size={20} />
              Passo 7: Validação dos 5 Pilares &amp; Fechamento Definitivo
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Revise a equação contábil dos 5 pilares apurados em tempo real. Se houver alguma divergência, você pode voltar para qualquer passo anterior para ajustar antes de selar o fechamento.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              disabled={runningAi || isLoading || isRefetching}
              onClick={handleManualRefresh}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs cursor-pointer border border-zinc-700 flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={`${(isLoading || isRefetching) ? 'animate-spin text-emerald-400' : ''}`} />
              Recalcular Diferença
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
            <AmountCell value={totalSaldoBanco} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-950 border-l-4 border-l-emerald-500 border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            2. Dinheiro MP
          </span>
          <p className="text-lg font-bold font-mono text-emerald-400 mt-1">
            <AmountCell value={dinheiroMp} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-950 border-l-4 border-l-blue-500 border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            3. A Receber
          </span>
          <p className="text-lg font-bold font-mono text-blue-400 mt-1">
            <AmountCell value={aReceber} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-950 border-l-4 border-l-amber-500 border-zinc-800">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            4. Na Loja OS (Pátio)
          </span>
          <p className="text-lg font-bold font-mono text-amber-400 mt-1">
            <AmountCell value={naLojaOs} />
          </p>
        </Card>

        <Card className="p-4 bg-zinc-950 border-l-4 border-l-purple-500 border-zinc-800 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              5. Faturamento do Dia
            </span>
            {fatAnterior > 0 && (
              <span className="text-[9px] font-mono text-zinc-400">
                Ant: {fatAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <p className="text-lg font-bold font-mono text-purple-400 mt-1">
            <AmountCell value={faturamentoDia} />
          </p>
          {manualInputs.odometroHoje > 0 && fatAnterior > 0 && (
            <span className="text-[10px] text-zinc-400 block mt-0.5 font-mono">
              Hoje: {manualInputs.odometroHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </Card>
      </div>

      {/* Semáforo & Conferência Central */}
      <Card
        className={`p-6 border-2 transition-all ${
          isOk
            ? 'border-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-950/20'
            : isWarning
            ? 'border-amber-500/40 bg-amber-500/5 shadow-lg shadow-amber-950/20'
            : 'border-rose-500/40 bg-rose-500/5 shadow-lg shadow-rose-950/20'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {isOk ? (
                <CheckCircle2 size={20} className="text-emerald-400" />
              ) : isWarning ? (
                <AlertTriangle size={20} className="text-amber-400" />
              ) : (
                <AlertTriangle size={20} className="text-rose-400" />
              )}
              <span
                className={`text-sm font-bold uppercase tracking-wider ${
                  isOk ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {isOk
                  ? '✓ Fechamento Equilibrado (Conformidade Contábil)'
                  : isWarning
                  ? '⚠ Divergência Residual Pequena (Dentro de Limites Aceitáveis)'
                  : '⚠ Divergência Significativa (Verifique Vínculos e Justificativas)'}
              </span>
              <Badge
                variant={isOk ? 'success' : isWarning ? 'warning' : 'danger'}
                dot
                className="text-[10px] font-mono"
              >
                Tolerância ± R$ 50,00
              </Badge>
            </div>

            {/* Demonstração da Equação Contábil */}
            <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800/80 text-xs font-mono text-zinc-300 space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span>(+) Faturamento do Dia:</span>
                <span className="text-purple-400 font-bold">R$ {faturamentoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>(-) Fluxo de Caixa (Caixa Hoje - Caixa Ontem):</span>
                <span className="text-cyan-400 font-bold">R$ {fluxoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-200 border-t border-zinc-800 pt-1 font-semibold">
                <span>(=) Valor Disponível para Contas:</span>
                <span className="text-emerald-400">R$ {valorDispContas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>(-) Subtotal de Contas a Cobrir (Contas + Juros):</span>
                <span className="text-rose-400 font-bold">R$ {subtotalContas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {!isOk && (
              <p className="text-xs text-amber-400 font-semibold mt-1">
                💡 Dica: Se necessário, clique em "Voltar" para justificar despesas extras no Passo 5 ou ajustar vínculos de OS no Passo 4.
              </p>
            )}
          </div>

          <div className="text-right shrink-0 bg-zinc-950/90 p-4 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block tracking-wider">Diferença Final Apurada</span>
            <p
              className={`text-3xl font-mono font-bold mt-1 ${
                isOk ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              R$ {diferencaFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-zinc-500 font-mono mt-1 block">
              {isOk ? 'Diferença Zero / Dentro da Margem' : diferencaFinal > 0 ? 'Sobra de Caixa' : 'Falta de Caixa / Despesa a Cobrir'}
            </span>
          </div>
        </div>
      </Card>

      {/* Navegação de Rodapé */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={onBack}
          className="py-2.5 px-4 text-xs font-semibold rounded-xl border-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Voltar para Ajustar (Passo 6)
        </Button>

        <Button
          onClick={onFinish}
          disabled={isSaving}
          className="py-3 px-8 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer text-sm shrink-0"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Selando Fechamento...
            </>
          ) : (
            <>
              <Lock size={16} />
              Conciliar e Selar o Dia Definitivamente
              <ArrowRight size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
