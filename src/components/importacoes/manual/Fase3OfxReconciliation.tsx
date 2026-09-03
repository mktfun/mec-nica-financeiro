import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Building2, 
  UploadCloud, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  AlertTriangle,
  Scale,
  CreditCard,
  Banknote,
  Search
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useStores } from '@/hooks/useStores';
import { useStoreFileMappings } from '@/hooks/useStoreFileMappings';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { parseCentralImports } from '@/lib/parsers/centralImportManager';
import { generateDeterministicHash } from '@/lib/parsers/hashUtils';

export interface Fase3OfxReconciliationProps {
  targetDate: string;
  onAdvance: () => void;
  onBack: () => void;
  className?: string;
}

interface OfxInflowItem {
  id: string;
  store_id: string;
  store_name?: string;
  amount: number;
  description: string;
  fitid?: string;
  date: string;
  matched_os_number?: string | null;
  manual_category?: string | null;
}

export function Fase3OfxReconciliation({
  targetDate,
  onAdvance,
  onBack,
  className = ''
}: Fase3OfxReconciliationProps) {
  const { data: stores = [] } = useStores();
  const { mapping } = useStoreFileMappings(stores);

  const [isLoading, setIsLoading] = useState(false);
  const [inflowList, setInflowList] = useState<OfxInflowItem[]>([]);
  const [viewMode, setViewMode] = useState<'drop' | 'review'>('drop');
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);
  const [storeRedeSettlement, setStoreRedeSettlement] = useState<Array<{
    storeId: string;
    storeName: string;
    redeApurado: number;
    ofxEntrou: number;
    aCompensar: number;
    status: 'liquidado' | 'a_compensar' | 'divergente';
  }>>([]);

  // 1. Carregar créditos bancários (OFX type = 'in') e apurar liquidação da Rede
  const loadOfxData = useCallback(async () => {
    if (!targetDate) return;
    setIsLoading(true);

    try {
      // 1. Buscar transações de crédito OFX
      const { data: ofxData, error: ofxErr } = await supabase
        .from('ofx_transactions')
        .select('*')
        .eq('target_date', targetDate)
        .eq('type', 'in')
        .order('amount', { ascending: false });

      if (ofxErr) throw ofxErr;

      const mapped: OfxInflowItem[] = (ofxData || []).map((t: any) => {
        const storeObj = stores.find(s => s.id === t.store_id);
        return {
          id: t.id,
          store_id: t.store_id,
          store_name: storeObj?.name || t.store_id,
          amount: Number(t.amount || 0),
          description: t.counterpart_name || t.bank_name || 'Crédito Bancário',
          fitid: t.fitid,
          date: t.occurred_at ? t.occurred_at.split('T')[0] : (t.target_date || targetDate),
          matched_os_number: t.matched_os_number,
          manual_category: t.manual_category
        };
      });
      setInflowList(mapped);
      if (mapped.length > 0) {
        setViewMode('review');
      }

      // 2. Apurar liquidação da Rede por loja (Rede apurado vs OFX entrou)
      const { data: posData } = await supabase
        .from('pos_transactions')
        .select('store_id, net_amount')
        .eq('target_date', targetDate);

      const posByStore: Record<string, number> = {};
      (posData || []).forEach((p: any) => {
        if (p.store_id) {
          posByStore[p.store_id] = (posByStore[p.store_id] || 0) + Number(p.net_amount || 0);
        }
      });

      const ofxRedeByStore: Record<string, number> = {};
      mapped.forEach(t => {
        const desc = t.description.toLowerCase();
        if (desc.includes('rede') || desc.includes('cielo') || desc.includes('stone') || desc.includes('getnet') || desc.includes('cartao') || desc.includes('credito') || desc.includes('debito')) {
          ofxRedeByStore[t.store_id] = (ofxRedeByStore[t.store_id] || 0) + t.amount;
        }
      });

      const settlementRows = stores.map(st => {
        const redeApurado = posByStore[st.id] || 0;
        const ofxEntrou = ofxRedeByStore[st.id] || 0;
        const aCompensar = Math.max(0, redeApurado - ofxEntrou);

        let status: 'liquidado' | 'a_compensar' | 'divergente' = 'liquidado';
        if (aCompensar > 0.05) {
          status = 'a_compensar';
        }

        return {
          storeId: st.id,
          storeName: st.name,
          redeApurado,
          ofxEntrou,
          aCompensar,
          status
        };
      });

      setStoreRedeSettlement(settlementRows);
    } catch (err: any) {
      console.error('Erro ao carregar OFX:', err);
      toast.error(`Falha ao carregar extratos: ${err.message}`);
    } finally {
      setIsLoading(false);
      setHasInitialLoaded(true);
    }
  }, [targetDate, stores]);

  useEffect(() => {
    loadOfxData();
  }, [loadOfxData]);

  // 2. Dropzone exclusiva para os 10 arquivos OFX
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsLoading(true);

    try {
      const parseResult = await parseCentralImports(acceptedFiles);
      const ofxResults = (parseResult?.ofxResults || []).filter(r => r.success);

      if (ofxResults.length === 0) {
        toast.warning('Nenhum arquivo válido de extrato bancário OFX foi identificado.');
        setIsLoading(false);
        return;
      }

      let totalInserted = 0;
      const ofxMap = new Map<string, any>();

      for (const r of ofxResults) {
        let storeId = mapping[r.accountKey] || mapping[r.storeAlias];
        if (storeId === 'GLOBAL') storeId = null as any;
        const storeObj = stores.find(s => s.id === storeId || s.name === r.storeAlias);
        const resolvedStoreId = storeId || storeObj?.id || null;
        const bankName = r.storeAlias?.split(' - ')[0]?.trim() || r.alias?.split(' - ')[0]?.trim() || 'Itaú';

        for (const t of r.transactions) {
          const baseDate = t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : targetDate;
          const occurredAt = `${baseDate}T12:00:00Z`;
          const effectiveFitid = t.fitid || generateDeterministicHash(
            baseDate,
            Math.abs(t.amount || 0),
            t.title || t.counterpart_name || t.memo || 'ofx',
            'ofx'
          );
          const normalizedType: 'in' | 'out' = (t.type === 'in' || t.amount > 0) ? 'in' : 'out';

          const payload = {
            id: crypto.randomUUID(),
            store_id: resolvedStoreId,
            target_date: targetDate,
            bank_name: bankName,
            amount: Math.abs(t.amount || 0),
            type: normalizedType,
            counterpart_name: t.counterpart_name || t.title || t.memo || t.payee || 'Lançamento OFX',
            cnpj_cpf: t.cnpj_cpf || null,
            fitid: effectiveFitid,
            occurred_at: occurredAt,
            contabilizar_no_subtotal: true
          };

          const mapKey = `${resolvedStoreId || 'null'}_${effectiveFitid}`;
          ofxMap.set(mapKey, payload);
        }
      }

      const txsToInsert = Array.from(ofxMap.values());

      if (txsToInsert.length > 0) {
        const { error: insErr } = await (supabase as any)
          .from('ofx_transactions')
          .upsert(txsToInsert, { onConflict: 'store_id, fitid', ignoreDuplicates: true });
        if (insErr) throw insErr;
        totalInserted = txsToInsert.length;
        toast.success(`${totalInserted} lançamentos de extrato OFX importados!`);
      }

      // Executa o auto_match_daily_transactions (que inclui PIX x OS)
      await (supabase as any).rpc('auto_match_daily_transactions', {
        p_date: targetDate
      });

      await loadOfxData();
    } catch (err: any) {
      console.error('Erro ao importar OFX:', err);
      toast.error(`Falha no processamento OFX: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [mapping, stores, targetDate, loadOfxData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-ofx': ['.ofx'],
      'text/plain': ['.ofx', '.ret']
    }
  });

  // Separação de PIXs Casados vs PIXs Órfãos
  const pixMatched = useMemo(() => inflowList.filter(t => !!t.matched_os_number), [inflowList]);
  const pixOrphans = useMemo(() => inflowList.filter(t => !t.matched_os_number && !t.description.toLowerCase().includes('rede')), [inflowList]);

  const totals = useMemo(() => {
    const totalIn = inflowList.reduce((a, b) => a + b.amount, 0);
    const totalRedeEntrou = storeRedeSettlement.reduce((a, b) => a + b.ofxEntrou, 0);
    const totalACompensar = storeRedeSettlement.reduce((a, b) => a + b.aCompensar, 0);
    return {
      totalIn,
      totalRedeEntrou,
      totalACompensar
    };
  }, [inflowList, storeRedeSettlement]);

  const formatBrl = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Loading inicial de verificação no banco
  if (!hasInitialLoaded && isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <LoadingSpinner size="lg" text="Verificando extratos bancários e compensações..." />
      </div>
    );
  }

  // =========================================================================
  // MODO 1: CLEAN DROP STATE (Sem arquivos importados)
  // =========================================================================
  if (viewMode === 'drop') {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Cabeçalho Minimalista da Fase 3 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                FASE 3 DE 4
              </span>
              <h2 className="text-xl font-bold text-zinc-100">
                Extratos Bancários OFX (Entradas, PIX & Rede)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Importe os extratos bancários das 10 filiais para conferir créditos em conta, compensações da Rede e PIX.
            </p>
          </div>

          {inflowList.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewMode('review')}
              className="h-8 px-3 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 self-start sm:self-auto"
            >
              Ver {inflowList.length} créditos já carregados →
            </Button>
          )}
        </div>

        {/* CARD DROPZONE CENTRALIZADO E AMPLO */}
        <div className="max-w-2xl mx-auto my-6">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-3xl p-10 sm:p-14 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
              ${isDragActive 
                ? 'border-emerald-500 bg-emerald-500/10 shadow-2xl shadow-emerald-500/10 scale-[1.01]' 
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70 shadow-xl'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/90 border border-zinc-700 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
              <UploadCloud size={32} />
            </div>
            <h4 className="font-bold text-base text-zinc-100 text-center">
              {isDragActive ? 'Solte os extratos OFX aqui' : 'Arraste os 10 arquivos de extrato bancário'}
            </h4>
            <p className="text-zinc-400 text-xs text-center mt-1.5 max-w-md">
              Arraste todos os arquivos de extrato (.ofx). O sistema reconhece automaticamente as filiais pelo número da conta bancária.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/80 text-[11px] font-mono text-zinc-300">
                10 Contas Correntes
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 font-semibold">
                PIX & D+1 Automático
              </span>
            </div>
          </div>
        </div>

        {/* BOTÃO DE RETORNO */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-10 px-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold rounded-xl"
          >
            <ArrowLeft size={15} className="mr-2" />
            Voltar para Fase 2: Vendas Rede
          </Button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODO 2: REVIEW STATE (Dropzone oculto, conferência bancária completa)
  // =========================================================================
  return (
    <div className={`space-y-6 ${className}`}>
      {/* CABEÇALHO DA ETAPA 3 COM TOTALIZADORES E BOTÃO DE REIMPORTAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
              FASE 3 DE 4
            </span>
            <h2 className="text-xl font-bold text-zinc-100">
              Extratos Bancários OFX (Entradas, PIX & Rede)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Bata os créditos bancários reais contra as OSs com PIX da Fase 1 e apure as liquidações da Rede da Fase 2.
          </p>
        </div>

        {/* Ações de Reimportação e Totalizadores */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setViewMode('drop')}
            className="h-9 px-3 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5"
            title="Importar outros extratos OFX ou adicionar arquivos"
          >
            <UploadCloud size={14} className="text-emerald-400" />
            Reimportar Extratos OFX
          </Button>

          <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[10px]">TOTAL CRÉDITOS OFX</span>
              <span className="text-emerald-400 font-bold">{formatBrl(totals.totalIn)}</span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div>
              <span className="text-zinc-500 block text-[10px]">REDE ENTROU CONTA</span>
              <span className="text-zinc-200 font-bold">{formatBrl(totals.totalRedeEntrou)}</span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div>
              <span className="text-zinc-500 block text-[10px]">A COMPENSAR (D+1)</span>
              <span className="text-indigo-400 font-bold">{formatBrl(totals.totalACompensar)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRIDS DE CONFERÊNCIA: PIX CASADO X ÓRFÃO E LIQUIDAÇÃO DE REDE */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" text="Processando extratos e batimento de entradas..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* TABELA 1: LIQUIDAÇÃO DE CARTÕES REDE NAS 10 LOJAS */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-indigo-400" />
                <h4 className="text-sm font-bold text-zinc-200">
                  Compensação de Cartões Rede nas 10 Lojas (Apurado Fase 2 vs Extrato OFX)
                </h4>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                Lotes D+1 / D+30 apurados automaticamente
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-2 font-semibold">Filial</th>
                    <th className="pb-2 font-semibold text-right">Líquido Rede (Fase 2)</th>
                    <th className="pb-2 font-semibold text-right">Creditado em Conta</th>
                    <th className="pb-2 font-semibold text-right">A Compensar Futuro</th>
                    <th className="pb-2 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {storeRedeSettlement.map(row => (
                    <tr key={row.storeId} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 font-bold text-zinc-200">{row.storeName}</td>
                      <td className="py-2.5 text-right text-zinc-300">{formatBrl(row.redeApurado)}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">{formatBrl(row.ofxEntrou)}</td>
                      <td className="py-2.5 text-right text-indigo-400 font-bold">{formatBrl(row.aCompensar)}</td>
                      <td className="py-2.5 text-center">
                        {row.status === 'liquidado' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                            LIQUIDADO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-bold">
                            A COMPENSAR (D+1)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* TABELA 2: CRÉDITOS PIX CASADOS VS ÓRFÃOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PIX CASADOS */}
            <Card className="p-4 bg-zinc-900/60 border-zinc-800">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <h4 className="text-sm font-bold text-zinc-200">
                    PIXs Casados com OS ({pixMatched.length})
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatBrl(pixMatched.reduce((a, b) => a + b.amount, 0))}
                </span>
              </div>

              {pixMatched.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Nenhum PIX vinculado automaticamente ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {pixMatched.map(item => (
                    <div 
                      key={item.id}
                      className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-200">{item.store_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                            OS #{item.matched_os_number}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 truncate max-w-[200px] block">
                          {item.description}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 block">{formatBrl(item.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* PIX ÓRFÃOS */}
            <Card className="p-4 bg-zinc-900/60 border-zinc-800">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <h4 className="text-sm font-bold text-zinc-200">
                    PIXs Órfãos sem OS ({pixOrphans.length})
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {formatBrl(pixOrphans.reduce((a, b) => a + b.amount, 0))}
                </span>
              </div>

              {pixOrphans.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Zero PIXs órfãos! Todos os recebimentos bancários foram conciliados.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {pixOrphans.map(item => (
                    <div 
                      key={item.id}
                      className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-200">{item.store_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold">
                            Pendente Vínculo
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400 truncate max-w-[200px] block">
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
        </div>
      )}

      {/* RODAPÉ DE NAVEGAÇÃO */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-11 px-5 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold rounded-xl"
        >
          <ArrowLeft size={16} className="mr-2" />
          Voltar para Fase 2: Vendas Rede
        </Button>

        <Button
          type="button"
          onClick={async () => {
            // Salva progresso da etapa na sessão
            await (supabase as any).rpc('save_pipeline_step_progress', {
              p_target_date: targetDate,
              p_step: 3,
              p_step_name: 'stage_3_ofx',
              p_step_data: { total_in: inflowList.length, pix_matched: pixMatched.length },
              p_mark_completed: true,
              p_selected_mode: 'manual'
            });
            onAdvance();
          }}
          className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 rounded-xl transition-all shadow-md shadow-emerald-950/40"
        >
          Avançar para Fase 4: Contas a Pagar
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
