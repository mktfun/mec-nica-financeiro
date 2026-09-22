import { useState, useEffect } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useStores } from '@/hooks/useStores';
import { usePreviousDaySnapshot } from '@/hooks/useDailySnapshot';
import { CentralImportWizard } from '@/components/importacoes/CentralImportWizard';
import { ResumoDiaPanel } from '@/components/conciliacao/ResumoDiaPanel';
import { ConciliacaoLojasView } from '@/components/conciliacao/ConciliacaoLojasView';
import { SandboxTraceabilityPanel } from '@/components/sandbox/SandboxTraceabilityPanel';
import { 
  SandboxDrilldownModals, 
  ActiveDrilldownModal 
} from '@/components/sandbox/modals/SandboxDrilldownModals';
import { 
  loadSandboxSession, 
  saveSandboxSession,
  clearSandboxSession, 
  SandboxReconciliationSession 
} from '@/lib/sandbox/sandboxStorage';
import { DailyReconciliationSummary } from '@/hooks/useBackendConciliacao';
import { supabase } from '@/lib/supabase';
import { 
  FlaskConical, 
  Layers, 
  FileSpreadsheet, 
  Scale, 
  Activity, 
  RotateCcw, 
  Calendar,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/teste/import')({
  component: TesteImportPage,
});

export function TesteImportPage() {
  const { data: stores = [] } = useStores();
  const [targetDate, setTargetDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [session, setSession] = useState<SandboxReconciliationSession | null>(null);
  const [activeTab, setActiveTab] = useState<'wizard' | 'conciliacao' | 'telemetria'>('wizard');
  const [activeModal, setActiveModal] = useState<ActiveDrilldownModal>(null);

  const { data: previousSnapshot } = usePreviousDaySnapshot(targetDate);

  // Carrega sessão existente do localStorage no mount
  useEffect(() => {
    const saved = loadSandboxSession();
    if (saved) {
      setSession(saved);
      if (saved.targetDate) {
        setTargetDate(saved.targetDate);
      }
    }
  }, []);

  // Se o summary salvo no localStorage estiver com caixa_anterior == 0 ou sem baseline D-1,
  // mas houver um snapshot anterior D-1 no banco, sincroniza automaticamente para garantir paridade contábil
  useEffect(() => {
    if (!session || !session.summary || !previousSnapshot) return;

    if (session.summary.caixa_anterior === 0 && Number(previousSnapshot.caixa_atual) > 0) {
      const prevCaixa = Number(previousSnapshot.caixa_atual);
      const prevAReceber = Number(previousSnapshot.a_receber_manual || (previousSnapshot.metadata as any)?.a_receber || 0);
      const prevDinheiroMp = Number(previousSnapshot.dinheiro_mp || 0);
      const prevPatio = Number(previousSnapshot.total_patio || 0);
      const prevMeta = (previousSnapshot.metadata as any) || {};
      const prevOdometro = Number(prevMeta.odometro_hoje ?? previousSnapshot.faturamento ?? 0);

      const currentSummary = session.summary;
      const newDinheiroMp = (currentSummary.dinheiro_mp !== undefined && currentSummary.dinheiro_mp !== null) 
        ? currentSummary.dinheiro_mp 
        : prevDinheiroMp;
      const newAReceber = (currentSummary.a_receber !== undefined && currentSummary.a_receber !== null) 
        ? currentSummary.a_receber 
        : (prevAReceber + (session.receivables?.reduce((acc, r) => acc + r.amount, 0) || 0));
      const newPatio = (currentSummary.na_loja_os !== undefined && currentSummary.na_loja_os !== null && currentSummary.na_loja_os > 0) 
        ? currentSummary.na_loja_os 
        : prevPatio;

      const saldoBancosTotal = (currentSummary.total_saldo_banco_positivo || currentSummary.saldo_bancos_positivo || 0) +
        (currentSummary.dinheiro_lojas || 0) +
        (currentSummary.cartoes_a_compensar || 0);

      const newCaixaAtual = Math.round(((saldoBancosTotal + newDinheiroMp + newAReceber + newPatio - (currentSummary.saldo_negativo_itau || 0)) + Number.EPSILON) * 100) / 100;
      const newFluxoCaixa = Math.round(((newCaixaAtual - prevCaixa) + Number.EPSILON) * 100) / 100;
      const faturamento = currentSummary.faturamento_periodo || currentSummary.faturamento_oi_base || 0;
      const newValorDispContas = Math.round(((faturamento - newFluxoCaixa) + Number.EPSILON) * 100) / 100;
      const subtotalContas = currentSummary.subtotal_contas || (currentSummary.contas_manual + (currentSummary.juros_rede || 0));
      const newDiferencaFinal = Math.round(((newValorDispContas - subtotalContas) + Number.EPSILON) * 100) / 100;
      const isApproved = Math.abs(newDiferencaFinal) <= 50;

      const updatedSummary: DailyReconciliationSummary = {
        ...currentSummary,
        caixa_anterior: prevCaixa,
        caixa_atual: newCaixaAtual,
        dinheiro_mp: newDinheiroMp,
        a_receber: newAReceber,
        na_loja_os: newPatio,
        odometro_anterior: prevOdometro,
        fluxo_caixa: newFluxoCaixa,
        valor_disp_contas: newValorDispContas,
        diferenca_final: newDiferencaFinal,
        status_geral: isApproved ? 'approved' : 'divergence'
      };

      const updatedSession: SandboxReconciliationSession = {
        ...session,
        summary: updatedSummary
      };

      saveSandboxSession(updatedSession);
      setSession(updatedSession);
      toast.info('Sessão do Sandbox sincronizada com o patrimônio de D-1!');
    }
  }, [session, previousSnapshot]);

  // Garante que o Pátio Real das filiais e total do estoque físico sejam restaurados na sessão
  useEffect(() => {
    if (!session || !session.summary) return;

    const currentSummary = session.summary;
    const isPatioDesatualizado = (currentSummary.na_loja_os || 0) < 50000;
    const hasZeroStorePatio = currentSummary.stores?.some(s => (s.na_loja_os || 0) === 0 && ['st-01', 'st-09', 'st-03'].includes(s.store_id));

    if (isPatioDesatualizado || hasZeroStorePatio) {
      let isMounted = true;
      (async () => {
        const { data: realPatioRows } = await supabase
          .from('patio_os')
          .select('store_id, total_value, paid_value, status')
          .lte('opened_at', `${session.targetDate}T23:59:59`);

        const storePatioMap: Record<string, number> = {};
        let totalPatioReal = 0;

        if (realPatioRows && realPatioRows.length > 0) {
          realPatioRows.forEach((os: any) => {
            const statusStr = String(os.status || '').toLowerCase();
            const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes(statusStr);
            const saldo = Number(os.total_value || 0) - Number(os.paid_value || 0);
            if (!isClosed && saldo > 0 && os.store_id) {
              storePatioMap[os.store_id] = Math.round(((storePatioMap[os.store_id] || 0) + saldo + Number.EPSILON) * 100) / 100;
              totalPatioReal = Math.round((totalPatioReal + saldo + Number.EPSILON) * 100) / 100;
            }
          });
        }

        if (totalPatioReal === 0) {
          const { data: reconRows } = await supabase
            .from('reconciliations')
            .select('store_id, na_loja_os')
            .eq('date', session.targetDate);
          if (reconRows && reconRows.length > 0) {
            reconRows.forEach((r: any) => {
              if (r.store_id && Number(r.na_loja_os || 0) > 0) {
                storePatioMap[r.store_id] = Number(r.na_loja_os);
                totalPatioReal = Math.round((totalPatioReal + Number(r.na_loja_os) + Number.EPSILON) * 100) / 100;
              }
            });
          }
        }

        if (isMounted && totalPatioReal > 0) {
          const updatedStores = (currentSummary.stores || []).map(s => {
            const realStorePatio = storePatioMap[s.store_id] !== undefined ? storePatioMap[s.store_id] : (s.na_loja_os || 0);
            const dif = Number(s.diferenca || 0);
            const isOk = Math.abs(dif) <= 0.05;
            return {
              ...s,
              na_loja_os: realStorePatio,
              patio_os: realStorePatio,
              status: isOk ? ('conciliado' as const) : s.status,
              status_compensacao: isOk ? ('sem_movimento' as const) : s.status_compensacao,
              nao_entrou_valor: isOk ? 0 : s.nao_entrou_valor
            };
          });

          const saldoBancosTotal = (currentSummary.total_saldo_banco_positivo || currentSummary.saldo_bancos_positivo || 0) +
            (currentSummary.dinheiro_lojas || 0) +
            (currentSummary.cartoes_a_compensar || 0);

          const newCaixaAtual = Math.round(((saldoBancosTotal + currentSummary.dinheiro_mp + currentSummary.a_receber + totalPatioReal - (currentSummary.saldo_negativo_itau || 0)) + Number.EPSILON) * 100) / 100;
          const prevCaixa = currentSummary.caixa_anterior || 0;
          const newFluxoCaixa = Math.round(((newCaixaAtual - prevCaixa) + Number.EPSILON) * 100) / 100;
          const faturamento = currentSummary.faturamento_periodo || currentSummary.faturamento_oi_base || 0;
          const newValorDispContas = Math.round(((faturamento - newFluxoCaixa) + Number.EPSILON) * 100) / 100;
          const subtotalContas = currentSummary.subtotal_contas || (currentSummary.contas_manual + (currentSummary.juros_rede || 0));
          const newDiferencaFinal = Math.round(((newValorDispContas - subtotalContas) + Number.EPSILON) * 100) / 100;
          const isApproved = Math.abs(newDiferencaFinal) <= 50;

          const updatedSummary: DailyReconciliationSummary = {
            ...currentSummary,
            na_loja_os: totalPatioReal,
            caixa_atual: newCaixaAtual,
            fluxo_caixa: newFluxoCaixa,
            valor_disp_contas: newValorDispContas,
            diferenca_final: newDiferencaFinal,
            status_geral: isApproved ? 'approved' : 'divergence',
            stores: updatedStores
          };

          const updatedSession: SandboxReconciliationSession = {
            ...session,
            summary: updatedSummary
          };

          saveSandboxSession(updatedSession);
          setSession(updatedSession);
        }
      })();

      return () => {
        isMounted = false;
      };
    }
  }, [session?.sessionId, session?.summary?.na_loja_os]);

  const handleSandboxSave = (overrides: {
    faturamentoDia: number;
    odometroHoje: number;
    dinheiroMp: number;
    aReceber: number;
    contasManual: number;
  }) => {
    if (!session || !session.summary) return;

    const currentSummary = session.summary;
    const saldoBancosTotal = (currentSummary.total_saldo_banco_positivo || currentSummary.saldo_bancos_positivo || 0) +
      (currentSummary.dinheiro_lojas || 0) +
      (currentSummary.cartoes_a_compensar || 0);

    const newCaixaAtual = Math.round(((saldoBancosTotal + overrides.dinheiroMp + overrides.aReceber + currentSummary.na_loja_os - (currentSummary.saldo_negativo_itau || 0)) + Number.EPSILON) * 100) / 100;
    const newFluxoCaixa = Math.round(((newCaixaAtual - currentSummary.caixa_anterior) + Number.EPSILON) * 100) / 100;
    const newValorDispContas = Math.round(((overrides.faturamentoDia - newFluxoCaixa) + Number.EPSILON) * 100) / 100;
    const subtotalContas = Math.round(((overrides.contasManual + (currentSummary.juros_rede || 0)) + Number.EPSILON) * 100) / 100;
    const newDiferencaFinal = Math.round(((newValorDispContas - subtotalContas) + Number.EPSILON) * 100) / 100;
    const isApproved = Math.abs(newDiferencaFinal) <= 50;

    const updatedSummary: DailyReconciliationSummary = {
      ...currentSummary,
      caixa_atual: newCaixaAtual,
      dinheiro_mp: overrides.dinheiroMp,
      a_receber: overrides.aReceber,
      faturamento_periodo: overrides.faturamentoDia,
      faturamento_oi_base: overrides.faturamentoDia,
      odometro_hoje: overrides.odometroHoje,
      contas_manual: overrides.contasManual,
      subtotal_contas: subtotalContas,
      fluxo_caixa: newFluxoCaixa,
      valor_disp_contas: newValorDispContas,
      diferenca_final: newDiferencaFinal,
      status_geral: isApproved ? 'approved' : 'divergence'
    };

    const updatedSession: SandboxReconciliationSession = {
      ...session,
      summary: updatedSummary
    };

    saveSandboxSession(updatedSession);
    setSession(updatedSession);
  };

  const handleSandboxBaixaDinheiro = (storeId: string, amount: number, itemIds?: string[]) => {
    if (!session) return;

    const targetStore = (session.summary.stores || []).find(
      st => st.store_id === storeId || String(st.store_id).toLowerCase() === String(storeId).toLowerCase()
    );
    const actualAmount = amount > 0 ? amount : Number(targetStore?.dinheiro_loja || 0);

    if (actualAmount <= 0) {
      toast.info('Esta filial já está com dinheiro no cofre zerado.');
      return;
    }

    // 1. Atualizar summary.stores
    const updatedStores = (session.summary.stores || []).map(st => {
      const isTarget = st.store_id === storeId || String(st.store_id).toLowerCase() === String(storeId).toLowerCase();
      if (isTarget) {
        const newDinheiro = Math.max(0, Math.round(((st.dinheiro_loja || 0) - actualAmount + Number.EPSILON) * 100) / 100);
        const newConsolidado = Math.round((((st.previsto_ofx || 0) + newDinheiro + (st.maquininha || 0)) + Number.EPSILON) * 100) / 100;
        return {
          ...st,
          dinheiro_loja: newDinheiro,
          saldo_consolidado: newConsolidado
        };
      }
      return st;
    });

    // 2. Atualizar cashVaultEntries
    let remainingToMark = actualAmount;
    const currentVault = session.cashVaultEntries || [];
    let updatedVaultEntries: typeof currentVault;

    if (currentVault.length > 0) {
      updatedVaultEntries = currentVault.map(entry => {
        const isStoreMatch = entry.store_id === storeId || 
          String(entry.store_id).toLowerCase() === String(storeId).toLowerCase() ||
          (entry.store_name && targetStore?.store_name && entry.store_name.toLowerCase() === targetStore.store_name.toLowerCase());

        if (isStoreMatch && entry.status === 'em_transito') {
          if (itemIds && itemIds.length > 0) {
            if (itemIds.includes(entry.id)) {
              return { ...entry, status: 'depositado' as const };
            }
          } else if (remainingToMark > 0) {
            remainingToMark -= entry.amount;
            return { ...entry, status: 'depositado' as const };
          }
        }
        return entry;
      });
    } else {
      updatedVaultEntries = [{
        id: `sandbox-cash-deposit-${storeId}-${Date.now()}`,
        store_id: storeId,
        store_name: targetStore?.store_name || storeId,
        os_number_ref: 'FECHAMENTO',
        amount: actualAmount,
        entry_date: session.targetDate,
        status: 'depositado' as const
      }];
    }

    // 3. Atualizar totais globais
    const oldDinheiro = session.summary.dinheiro_lojas || 0;
    const newDinheiroGlobal = Math.max(0, Math.round((oldDinheiro - actualAmount + Number.EPSILON) * 100) / 100);
    const diffDinheiro = newDinheiroGlobal - oldDinheiro;
    const newCaixaAtual = Math.round(((session.summary.caixa_atual + diffDinheiro) + Number.EPSILON) * 100) / 100;
    const newFluxoCaixa = Math.round(((newCaixaAtual - (session.summary.caixa_anterior || 0)) + Number.EPSILON) * 100) / 100;
    const faturamento = session.summary.faturamento_periodo || session.summary.faturamento_oi_base || 0;
    const newValorDispContas = Math.round(((faturamento - newFluxoCaixa) + Number.EPSILON) * 100) / 100;
    const newDiferencaFinal = Math.round(((newValorDispContas - (session.summary.subtotal_contas || 0)) + Number.EPSILON) * 100) / 100;

    const updatedSession: SandboxReconciliationSession = {
      ...session,
      cashVaultEntries: updatedVaultEntries,
      summary: {
        ...session.summary,
        stores: updatedStores,
        dinheiro_lojas: newDinheiroGlobal,
        dinheiro_em_lojas: newDinheiroGlobal,
        caixa_atual: newCaixaAtual,
        fluxo_caixa: newFluxoCaixa,
        valor_disp_contas: newValorDispContas,
        diferenca_final: newDiferencaFinal,
        status_geral: Math.abs(newDiferencaFinal) <= 50 ? 'approved' : 'divergence'
      }
    };

    saveSandboxSession(updatedSession);
    setSession(updatedSession);
    toast.success(`[SANDBOX] Baixa de ${actualAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} realizada na filial ${targetStore?.store_name || storeId}!`);
  };

  const handleClearSession = () => {
    clearSandboxSession();
    setSession(null);
    setActiveTab('wizard');
    toast.success('Sessão simulada no Local Storage limpa com sucesso!');
  };

  const handleSandboxComplete = (newSession: SandboxReconciliationSession) => {
    setSession(newSession);
    setActiveTab('conciliacao');
  };

  const summary = session?.summary;
  const storesList = summary?.stores || [];
  const totalSistema = storesList.reduce((acc, log) => acc + (log.previsto_ofx || 0), 0);
  const totalBancarioIn = (summary?.total_entradas_ofx && summary.total_entradas_ofx > 0) 
    ? summary.total_entradas_ofx 
    : storesList.reduce((acc, s) => acc + (s.entradas_realizadas || 0), 0);
  const totalBancarioRaw = summary?.total_saldo_banco || 0;
  const divergenciaGlobal = summary?.diferenca_final || 0;
  const isApproved = summary?.status_geral === 'approved';

  return (
    <AppShell>
      <PageContainer variant="finance" className="space-y-6 pb-20 pt-2 max-w-7xl mx-auto">
        
        {/* HEADER DO SANDBOX HUB */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                <FlaskConical size={20} />
              </div>
              <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                Sandbox de Importação & Conciliação
              </h1>
              <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-300 bg-cyan-500/10 font-bold px-2 py-0.5">
                100% LOCAL STORAGE • ZERO DB
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Ambiente de execução real sem mutações no banco de dados. Solte arquivos reais de extratos OFX, relatórios de vendas Rede e planilhas de OS para validar o fechamento e traquear todas as etapas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <Calendar size={14} className="text-zinc-400" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 focus:outline-none"
              />
            </div>

            {session && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearSession}
                className="h-8 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5"
                title="Limpar dados salvos no localStorage"
              >
                <RotateCcw size={13} />
                Resetar Simulação
              </Button>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE AS 3 ABAS PRINCIPAIS */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'wizard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <FileSpreadsheet size={16} />
            1. Importação & Motor Real
          </button>

          <button
            onClick={() => setActiveTab('conciliacao')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'conciliacao'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Scale size={16} />
            2. Painel de Conciliação Simulada
            {session && (
              <span className={`w-2 h-2 rounded-full ${isApproved ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            )}
          </button>

          <button
            onClick={() => setActiveTab('telemetria')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'telemetria'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Activity size={16} />
            3. Traqueamento Total & Telemetria
            {session?.matchingResult && (
              <Badge variant="outline" className="text-[10px] ml-1 px-1.5 py-0 border-indigo-400/40 text-indigo-300">
                {session.matchingResult.matchedCount}
              </Badge>
            )}
          </button>
        </div>

        {/* CONTEÚDO DAS ABAS */}

        {/* ABA 1: CENTRAL IMPORT WIZARD EM MODO SANDBOX */}
        {activeTab === 'wizard' && (
          <div className="space-y-4">
            <CentralImportWizard
              onCancel={() => {}}
              initialDate={targetDate}
              isSandbox={true}
              onSandboxComplete={handleSandboxComplete}
            />
          </div>
        )}

        {/* ABA 2: PAINEL DE CONCILIAÇÃO SIMULADA (IDÊNTICO À PRODUÇÃO) */}
        {activeTab === 'conciliacao' && (
          <div className="space-y-6">
            {!session || !summary ? (
              <Card className="p-12 text-center bg-zinc-900 border-zinc-800">
                <AlertCircle className="mx-auto text-amber-400 mb-3" size={32} />
                <h3 className="text-base font-bold text-zinc-100">Nenhum Fechamento Simulado Disponível</h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                  Carregue seus arquivos na Aba 1 ("Importação & Motor Real") e confirme a simulação para visualizar o fechamento completo dos 5 pilares aqui.
                </p>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setActiveTab('wizard')}
                  className="mt-4 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl"
                >
                  Ir para Importação <ArrowRight size={14} className="ml-1.5" />
                </Button>
              </Card>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Banner de Status da Conciliação Simulada */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${isApproved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-100">
                          {isApproved ? 'Fechamento Simulado Aprovado (Zero Divergência)' : 'Fechamento Simulado com Divergência Residual'}
                        </h3>
                        {previousSnapshot && (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                            <Database size={10} /> D-1 Ancorado ({previousSnapshot.date})
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">
                        Visualização gerada 100% a partir dos dados em Local Storage para a data {session.targetDate}. Caixa Anterior herdado de D-1: R$ {Number(summary.caixa_anterior || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveModal('cofre')}
                      className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-950/30 rounded-xl"
                    >
                      Cofre ({session.cashVaultEntries?.length || 0}) ↗
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveModal('recebiveis')}
                      className="text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-950/30 rounded-xl"
                    >
                      Títulos ({session.receivables?.length || 0}) ↗
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('telemetria')}
                      className="text-xs border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/30 rounded-xl"
                    >
                      Ver Raio-X do Motor <ArrowRight size={13} className="ml-1.5" />
                    </Button>
                  </div>
                </div>

                {/* Resumo Dia Panel (Idêntico ao oficial) */}
                <ResumoDiaPanel
                  selectedDate={session.targetDate}
                  onDayChange={() => {}}
                  onDateSelect={() => {}}
                  divergenciaGlobal={divergenciaGlobal}
                  isApproved={isApproved}
                  detalhesCount={0}
                  totalSistema={totalSistema}
                  totalBancarioIn={totalBancarioIn}
                  totalBancarioRaw={totalBancarioRaw}
                  totalOfxIn={summary.total_entradas_ofx || 0}
                  totalOfxOut={summary.total_saidas_ofx || 0}
                  summary={summary}
                  isSandbox={true}
                  onOpenSandboxModal={(modal) => setActiveModal(modal)}
                  onSandboxSave={handleSandboxSave}
                  onSandboxBaixaDinheiro={handleSandboxBaixaDinheiro}
                />

                {/* Grid por Loja (Idêntico ao oficial) */}
                <div className="pt-4 border-t border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                    <Layers size={16} className="text-cyan-400" />
                    Conferência por Filial (Simulação em Memória)
                  </h3>
                  <ConciliacaoLojasView
                    stores={stores}
                    summary={summary}
                    selectedDate={session.targetDate}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: TRAQUEAMENTO TOTAL & TELEMETRIA FORENSE */}
        {activeTab === 'telemetria' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <SandboxTraceabilityPanel
              session={session}
              onClearSession={handleClearSession}
            />
          </div>
        )}

        {/* Modais de Drilldown Nativos do Sandbox (100% em memória) */}
        {session && (
          <SandboxDrilldownModals
            session={session}
            activeModal={activeModal}
            onClose={() => setActiveModal(null)}
            onUpdateSession={(updated) => setSession(updated)}
            onSandboxBaixaDinheiro={handleSandboxBaixaDinheiro}
          />
        )}

      </PageContainer>
    </AppShell>
  );
}
