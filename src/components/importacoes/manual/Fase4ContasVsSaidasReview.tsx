import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Receipt, 
  UploadCloud, 
  CheckCircle2, 
  ArrowLeft, 
  RefreshCw, 
  AlertTriangle,
  Lock,
  Unlock,
  Building2,
  TrendingUp,
  Coins,
  Scale
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RevenueAdjustmentsCard } from '@/components/importacoes/wizard/RevenueAdjustmentsCard';
import { useStores } from '@/hooks/useStores';
import { useStoreFileMappings } from '@/hooks/useStoreFileMappings';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { parseCentralImports } from '@/lib/parsers/centralImportManager';

export interface Fase4ContasVsSaidasReviewProps {
  targetDate: string;
  onBack: () => void;
  onCloseDaySuccess: () => void;
  className?: string;
}

interface OutflowItem {
  id: string;
  store_id: string;
  store_name?: string;
  amount: number;
  description: string;
  matched_bill_id?: string | null;
  manual_category?: string | null;
}

export function Fase4ContasVsSaidasReview({
  targetDate,
  onBack,
  onCloseDaySuccess,
  className = ''
}: Fase4ContasVsSaidasReviewProps) {
  const { data: stores = [] } = useStores();
  const { mapping } = useStoreFileMappings(stores);

  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [outflows, setOutflows] = useState<OutflowItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [revenueAdjustmentsTotal, setRevenueAdjustmentsTotal] = useState(0);

  // 1. Carregar débitos bancários (OFX type = 'out') e resumo dos 5 Pilares
  const loadData = useCallback(async () => {
    if (!targetDate) return;
    setIsLoading(true);

    try {
      // 1. Buscar débitos OFX
      const { data: ofxData, error: ofxErr } = await supabase
        .from('ofx_transactions')
        .select('*')
        .eq('target_date', targetDate)
        .eq('type', 'out')
        .order('amount', { ascending: false });

      if (ofxErr) throw ofxErr;

      const mapped: OutflowItem[] = (ofxData || []).map((t: any) => {
        const storeObj = stores.find(s => s.id === t.store_id);
        return {
          id: t.id,
          store_id: t.store_id,
          store_name: storeObj?.name || t.store_id,
          amount: Number(t.amount || 0),
          description: t.description || t.title || 'Débito Bancário',
          matched_bill_id: t.matched_bill_id,
          manual_category: t.manual_category
        };
      });
      setOutflows(mapped);

      // 2. Buscar resumo oficial dos 5 Pilares no PostgreSQL
      const { data: sumData, error: sumErr } = await (supabase as any).rpc('get_daily_reconciliation_summary', {
        p_date: targetDate,
        p_force_dynamic: true
      });

      if (!sumErr && sumData) {
        setSummary(sumData);
      }
    } catch (err: any) {
      console.error('Erro ao carregar Fase 4:', err);
      toast.error(`Falha ao carregar dados: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [targetDate, stores]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Dropzone exclusiva para planilha de Contas a Pagar
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsLoading(true);

    try {
      const parseResult = await parseCentralImports(acceptedFiles);
      const billsResults = (parseResult?.contasAPagarResults || parseResult?.contasPagarResults || []).filter(r => r.success);

      if (billsResults.length === 0) {
        toast.warning('Nenhum arquivo válido de Contas a Pagar foi identificado.');
        setIsLoading(false);
        return;
      }

      const billsToInsert: any[] = [];

      for (const r of billsResults) {
        for (const b of r.bills) {
          const storeName = (b as any).storeName || b.store_name;
          let storeId = mapping[storeName];
          if (storeId === 'GLOBAL') storeId = null as any;
          const storeObj = stores.find(s => s.id === storeId || s.name === storeName);
          const resolvedStoreId = storeId || storeObj?.id || 'st-default';
          const dueDate = (b as any).dueDate || b.due_date || targetDate;

          billsToInsert.push({
            store_id: resolvedStoreId,
            date: targetDate,
            due_date: dueDate,
            amount: b.amount,
            description: b.description || 'Título a Pagar',
            category: b.category || 'Geral',
            status: 'pendente',
            contabilizar_no_subtotal: true
          });
        }
      }

      if (billsToInsert.length > 0) {
        const { error: insErr } = await supabase.from('daily_manual_bills').insert(billsToInsert);
        if (insErr) throw insErr;
        toast.success(`${billsToInsert.length} títulos de Contas a Pagar importados!`);
      }

      // Executa auto-match de saídas determinístico
      await (supabase as any).rpc('auto_match_saidas', {
        p_target_date: targetDate
      });

      await loadData();
    } catch (err: any) {
      console.error('Erro ao importar Contas:', err);
      toast.error(`Falha no processamento: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [mapping, stores, targetDate, loadData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    }
  });

  // 3. Selar Fechamento Manual
  const handleCloseDay = async () => {
    setIsClosing(true);
    try {
      const { data: closeResult, error: closeErr } = await (supabase as any).rpc('close_daily_snapshot', {
        p_date: targetDate,
        p_notes: 'Fechamento Manual Homologado (Sem IA)',
        p_metadata: { closed_via: 'manual_pipeline_4_phases' }
      });

      if (closeErr) throw closeErr;

      // Salva conclusão na sessão
      await (supabase as any).rpc('save_pipeline_step_progress', {
        p_target_date: targetDate,
        p_step: 4,
        p_step_name: 'stage_4_contas',
        p_step_data: { closed: true },
        p_mark_completed: true,
        p_selected_mode: 'manual'
      });

      toast.success('🎉 Fechamento diário homologado e selado com sucesso no PostgreSQL!');
      onCloseDaySuccess();
    } catch (err: any) {
      console.error('Erro ao selar fechamento:', err);
      toast.error(`Não foi possível selar o fechamento: ${err.message}`);
    } finally {
      setIsClosing(false);
    }
  };

  const matchedOutflows = useMemo(() => outflows.filter(t => !!t.matched_bill_id || !!t.manual_category), [outflows]);
  const unmatchedOutflows = useMemo(() => outflows.filter(t => !t.matched_bill_id && !t.manual_category), [outflows]);

  const formatBrl = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const delta = Number(summary?.diferenca_final || 0);
  const isApproved = Math.abs(delta) <= 50;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* CABEÇALHO DA ETAPA 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
              FASE 4 DE 4
            </span>
            <h2 className="text-xl font-bold text-zinc-100">
              Contas a Pagar, Saídas Bancárias & Selagem do Dia
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Confronte os débitos reais do extrato bancário contra os títulos do ERP, adicione receitas corporativas e homologue o fechamento.
          </p>
        </div>

        {/* Live Delta Tracker dos 5 Pilares */}
        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-mono">
          <div>
            <span className="text-zinc-500 block text-[10px]">SUBTOTAL CONTAS</span>
            <span className="text-rose-400 font-bold">{formatBrl(summary?.subtotal_contas)}</span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block text-[10px]">DISPONÍVEL</span>
            <span className="text-zinc-200 font-bold">{formatBrl(summary?.valor_disponivel)}</span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block text-[10px]">DIFERENÇA FINAL (Δ)</span>
            <span className={`font-bold ${isApproved ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatBrl(delta)}
            </span>
          </div>
        </div>
      </div>

      {/* DROPZONE EXCLUSIVA DE CONTAS A PAGAR */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-emerald-500 bg-emerald-500/10' 
            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 mb-2">
          <UploadCloud size={22} />
        </div>
        <h4 className="font-bold text-sm text-zinc-200 text-center">
          {isDragActive ? 'Solte a planilha de Contas a Pagar aqui' : 'Arraste a planilha de Contas a Pagar do ERP (.xlsx, .csv)'}
        </h4>
        <p className="text-zinc-400 text-xs text-center mt-0.5">
          O motor cruza os pagamentos automaticamente contra os débitos das contas correntes.
        </p>
      </div>

      {/* RECEITAS EXTRAS CORPORATIVAS DRE */}
      <RevenueAdjustmentsCard
        targetDate={targetDate}
        stores={stores}
        isLocked={false}
        onTotalChange={(t) => {
          setRevenueAdjustmentsTotal(t);
          loadData();
        }}
      />

      {/* GRIDS DE SAÍDAS BANCÁRIAS: CASADAS VS ÓRFÃS */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" text="Auditando contas e saídas bancárias..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SAÍDAS CASADAS */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <h4 className="text-sm font-bold text-zinc-200">
                  Saídas Conciliadas com Títulos ({matchedOutflows.length})
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {formatBrl(matchedOutflows.reduce((a, b) => a + b.amount, 0))}
              </span>
            </div>

            {matchedOutflows.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                Nenhum débito bancário conciliado com título ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {matchedOutflows.map(item => (
                  <div 
                    key={item.id}
                    className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{item.store_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                          {item.manual_category || 'Conciliado ERP'}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate max-w-[220px] block">
                        {item.description}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-400 block">{formatBrl(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* DÉBITOS ÓRFÃOS (NÃO PROVISIONADOS) */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <h4 className="text-sm font-bold text-zinc-200">
                  Débitos sem Provisão no ERP ({unmatchedOutflows.length})
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">
                {formatBrl(unmatchedOutflows.reduce((a, b) => a + b.amount, 0))}
              </span>
            </div>

            {unmatchedOutflows.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                Zero saídas órfãs! Todos os pagamentos bancários foram provisionados.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {unmatchedOutflows.map(item => (
                  <div 
                    key={item.id}
                    className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{item.store_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold">
                          Débito não Provisionado
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate max-w-[220px] block">
                        {item.description}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-300 block">{formatBrl(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* PLACAR DE HOMOLOGAÇÃO & SELAGEM */}
      <Card className="p-5 bg-zinc-900/90 border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
            <Scale size={18} className="text-emerald-400" />
            Auditoria Final dos 5 Pilares ({targetDate})
          </h4>
          <p className="text-xs text-zinc-400 mt-1">
            Status Geral: <strong className={isApproved ? 'text-emerald-400' : 'text-rose-400'}>{isApproved ? 'CONFORME / EQUILIBRADO' : 'DIVERGENTE'}</strong> · Diferença Residual: <strong className="font-mono">{formatBrl(delta)}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-11 px-5 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold rounded-xl"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar para Fase 3: OFX
          </Button>

          <Button
            type="button"
            onClick={handleCloseDay}
            disabled={isClosing || !isApproved}
            className={`h-11 px-6 font-bold text-xs flex items-center gap-2 rounded-xl transition-all shadow-md ${
              isApproved 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40' 
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-750'
            }`}
          >
            <Lock size={15} />
            {isClosing ? 'Selando Fechamento...' : 'Selar e Homologar Fechamento'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
