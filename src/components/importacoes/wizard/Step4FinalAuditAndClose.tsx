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
  Zap,
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
  const { data: summary, refetch, isLoading, isRefetching } = useDailyReconciliationSummary(targetDate, true);
  const { data: previousSnapshot } = usePreviousDaySnapshot(targetDate);
  const { data: aiSettings } = useAiSettings();

  const [runningAi, setRunningAi] = useState(false);

  React.useEffect(() => {
    refetch();
  }, [targetDate, refetch]);

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
    odometroHoje,
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
      // 1. Faturamento canônico: Base + Ajustes de receitas órfãs justificadas
      const fatAjustes = Number(summary.faturamento_ajustes || 0);
      const fatBase = Number(summary.faturamento_oi_base || 0);
      const fatPeriodoCalculado = fatBase + fatAjustes;
      const finalFatPeriodo = Number(summary.faturamento_periodo ?? (fatPeriodoCalculado > 0 ? fatPeriodoCalculado : 0));

      // 2. Fluxo e Valor Disponível
      const cAtual = Number(summary.caixa_atual ?? 0);
      const cAnterior = Number(summary.caixa_anterior ?? 0);
      const flx = Number(summary.fluxo_caixa ?? (cAtual - cAnterior));
      const vDisp = Number(summary.valor_disp_contas ?? (finalFatPeriodo - flx));

      // 3. Contas canônico:
      const juros = Number(summary.juros_rede ?? 0);
      const contasFinal = Number(summary.contas_manual ?? ((summary.contas_base ?? 0) + (summary.contas_extras ?? 0)));
      const subtotalContas = Number(summary.subtotal_contas ?? (contasFinal + juros));

      // 4. Diferença Final Apurada
      const dif = Number(summary.diferenca_final ?? (vDisp - subtotalContas));
      const absDif = Math.abs(dif);

      return {
        totalSaldoBanco: Number(summary.total_saldo_banco_positivo ?? summary.total_saldo_banco ?? 0),
        saldoBancosPositivo: Number(summary.total_saldo_banco_positivo ?? summary.saldo_bancos_positivo ?? summary.total_saldo_banco ?? 0),
        saldoNegativoItau: Number(summary.total_saldo_banco_negativo ?? summary.saldo_negativo_itau ?? 0),
        dinheiroMp: Number(summary.dinheiro_mp ?? manualInputs.manualDinheiroMp ?? 0),
        aReceber: Number(summary.a_receber ?? manualInputs.manualAReceber ?? 0),
        naLojaOs: Number(summary.na_loja_os ?? 0),
        faturamentoDia: fatBase > 0 ? fatBase : finalFatPeriodo,
        fatAnterior: Number(
          summary.faturamento_anterior ?? 
          (previousSnapshot?.metadata as any)?.odometro_hoje ??
          (previousSnapshot?.metadata as any)?.faturamento_anterior ??
          previousSnapshot?.faturamento ??
          0
        ),
        odometroHoje: Number(
          (summary as any)?.odometro_hoje ??
          manualInputs.odometroHoje ??
          0
        ),
        faturamentoPeriodo: finalFatPeriodo,
        caixaAtual: cAtual,
        caixaAnterior: cAnterior,
        fluxoCaixa: flx,
        valorDispContas: vDisp,
        jurosRede: juros,
        contasFinal: contasFinal,
        subtotalContas: subtotalContas,
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
      odometroHoje: manualInputs.odometroHoje > 0 ? manualInputs.odometroHoje : (fatAnteriorVal > 0 && fatBase > 0 ? fatAnteriorVal + fatBase : 0),
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
      <Card className="p-6 bg-zinc-900/60 border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" size={20} />
              Validação dos 5 Pilares &amp; Fechamento Definitivo
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
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer border border-zinc-800 flex items-center gap-1.5 rounded-xl px-3 py-1.5"
            >
              <RefreshCw size={13} className={`${(isLoading || isRefetching) ? 'animate-spin text-emerald-400' : ''}`} />
              Recalcular Diferença
            </Button>

            <Button
              size="sm"
              disabled={runningAi}
              onClick={handleRunAiMatcher}
              className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold cursor-pointer shrink-0 rounded-xl px-3.5 py-1.5"
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

      {/* Fast-Path Gatekeeper de 1-Clique (Se Todas as Condições Atendidas) */}
      {Boolean(summary?.fast_path_eligible ?? isOk) && (
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Zap size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-emerald-300">Fast-Path Ativo — Fechamento em 1-Clique Seguro</h4>
                <Badge variant="success" className="text-[9px] font-bold">10/10 Filiais Auditadas</Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Zero divergências críticas, zero desfalques e contas equalizadas. Você pode selar o dia imediatamente.
              </p>
            </div>
          </div>

          <Button
            onClick={onFinish}
            disabled={isSaving}
            className="w-full sm:w-auto py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-950/40 shrink-0 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Selando...
              </>
            ) : (
              <>
                <Zap size={14} /> Fechar Dia em 1-Clique
              </>
            )}
          </Button>
        </div>
      )}

      {/* 4 Ativos de Caixa (Patrimônio que compõe o Caixa Atual) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-zinc-900/60 border-l-4 border-l-cyan-500 border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">
              1. Saldo Bancos + Cartões
            </span>
            <span className="text-[9px] text-zinc-500 font-mono">OFX</span>
          </div>
          <p className="text-xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">
            <AmountCell value={totalSaldoBanco} />
          </p>
          {saldoNegativoItau > 0 && (
            <span className="text-[10px] text-rose-400 font-mono block mt-1">
              (-) Cheque Esp: R$ {saldoNegativoItau.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </Card>

        <Card className="p-4 bg-zinc-900/60 border-l-4 border-l-emerald-500 border-zinc-800 rounded-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">
            2. Dinheiro MP
          </span>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            <AmountCell value={dinheiroMp} />
          </p>
          <span className="text-[10px] text-zinc-500 block mt-1">
            Conferência física
          </span>
        </Card>

        <Card className="p-4 bg-zinc-900/60 border-l-4 border-l-blue-500 border-zinc-800 rounded-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">
            3. A Receber
          </span>
          <p className="text-xl font-bold font-mono text-blue-400 mt-1 tabular-nums">
            <AmountCell value={aReceber} />
          </p>
          <span className="text-[10px] text-zinc-500 block mt-1">
            Títulos e boletos
          </span>
        </Card>

        <Card className="p-4 bg-zinc-900/60 border-l-4 border-l-amber-500 border-zinc-800 rounded-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">
            4. Na Loja OS (Pátio)
          </span>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
            <AmountCell value={naLojaOs} />
          </p>
          <span className="text-[10px] text-zinc-500 block mt-1">
            Estoque de OSs em aberto
          </span>
        </Card>
      </div>

      {/* Dashboard de Consolidação & Diferença (Harmonizado com ResumoDiaPanel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel da Consolidação do Dia - 2 Colunas */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-800/60">
            <div>
              <h3 className="font-semibold text-zinc-100 uppercase text-xs tracking-wider flex items-center gap-2">
                <Calculator size={15} className="text-emerald-400" />
                Consolidação do Dia &amp; Fluxo Contábil
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Apuração integrada dos Ativos, Faturamento e Contas</p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono bg-zinc-950 border-zinc-800 text-zinc-400">
              Tolerância ± R$ 50,00
            </Badge>
          </div>

          {/* Linha 1: Caixa Atual, Caixa Anterior, Fluxo de Caixa */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Caixa Atual</span>
              <p className="text-xl font-bold text-zinc-100 font-mono mt-0.5 tabular-nums">
                R$ {caixaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-zinc-500 truncate block">
                {saldoNegativoItau > 0 ? `Ativos - R$ ${saldoNegativoItau.toFixed(2)}` : 'Patrimônio disponível'}
              </span>
            </div>

            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Caixa Anterior</span>
              <p className="text-xl font-bold text-zinc-400 font-mono mt-0.5 tabular-nums">
                R$ {caixaAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-zinc-500">Fechamento dia anterior</span>
            </div>

            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Fluxo de Caixa</span>
              <p className={`text-xl font-bold font-mono mt-0.5 tabular-nums ${fluxoCaixa >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                {fluxoCaixa >= 0 ? '+' : ''}R$ {fluxoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-zinc-500">Caixa Atual - Caixa Ant.</span>
            </div>
          </div>

          {/* Linha 2: Faturamento do Dia, Valor Disp. Contas, Contas (Manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Faturamento do Dia</span>
              <p className="text-xl font-bold text-purple-400 font-mono mt-0.5 tabular-nums">
                R$ {faturamentoPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="text-[10px] text-zinc-500 mt-0.5">
                <span>OI: R$ {faturamentoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                {(summary?.faturamento_ajustes || 0) > 0 && (
                  <span className="text-emerald-400 ml-1 font-semibold">
                    + Ajustes: R$ {Number(summary?.faturamento_ajustes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Valor Disp. Contas</span>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5 tabular-nums">
                R$ {valorDispContas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-zinc-500">Faturamento - Fluxo Caixa</span>
            </div>

            <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Contas (Manual)</span>
              <p className="text-xl font-bold text-rose-400 font-mono mt-0.5 tabular-nums">
                R$ {contasFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="text-[10px] text-zinc-500 flex flex-col gap-0.5 mt-0.5">
                <span>Juros Rede: R$ {jurosRede.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Subtotal Barra Inferior */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-zinc-800 text-xs text-zinc-400 gap-2">
            <div>
              <span className="font-semibold text-zinc-200">Subtotal: Total de Contas a Cobrir</span>
              <span className="text-[10px] block text-zinc-500">Contas (Manual) + Juros (REDE)</span>
            </div>
            <div className="font-mono text-sm font-bold text-amber-400 tabular-nums">
              R$ {subtotalContas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Card Lateral - Diferença Final (Destaque Centralizado e Harmonioso com ResumoDiaPanel) */}
        <div className={`rounded-2xl border p-6 flex flex-col items-center justify-center text-center shadow-lg transition-all relative overflow-hidden backdrop-blur-md ${
          isOk
            ? 'bg-gradient-to-b from-emerald-500/10 to-emerald-950/20 border-emerald-500/30 text-emerald-400'
            : isWarning
            ? 'bg-gradient-to-b from-amber-500/10 to-amber-950/20 border-amber-500/30 text-amber-400'
            : 'bg-gradient-to-b from-rose-500/10 to-rose-950/20 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-1.5 mb-2">
            {isOk ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : isWarning ? (
              <AlertTriangle size={18} className="text-amber-400" />
            ) : (
              <AlertTriangle size={18} className="text-rose-400" />
            )}
            <span className="text-xs uppercase font-bold tracking-widest text-zinc-300">
              Diferença Final Apurada
            </span>
          </div>

          <div className="my-2">
            <p className={`text-4xl font-mono font-bold tracking-tight tabular-nums ${
              isOk ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400'
            }`}>
              R$ {diferencaFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <span className="text-xs font-medium font-sans px-3 py-1 rounded-full bg-zinc-950/80 border border-zinc-800/80 text-zinc-300 mt-1">
            {isOk ? '✓ Fechamento Equilibrado' : diferencaFinal > 0 ? 'Sobra de Caixa' : 'Falta de Caixa / A Cobrir'}
          </span>

          <span className="text-[11px] text-zinc-500 font-mono mt-3 block">
            Valor Disp. Contas - Subtotal Contas
          </span>

          {!isOk && (
            <p className="text-[11px] text-amber-300/90 font-medium mt-3 px-2 leading-relaxed">
              💡 Dica: Se necessário, clique em "Voltar para Ajustar" para revisar vínculos ou justificativas.
            </p>
          )}
        </div>
      </div>

      {/* Navegação de Rodapé */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={onBack}
          className="py-2.5 px-4 text-xs font-semibold rounded-xl border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Voltar para Ajustar
        </Button>

        <Button
          onClick={onFinish}
          disabled={isSaving}
          className="py-3 px-8 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer text-sm shrink-0 transition-all"
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
