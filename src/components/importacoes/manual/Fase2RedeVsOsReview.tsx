import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  CreditCard, 
  UploadCloud, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  AlertTriangle,
  Link,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SmartResolutionStrip, ValueCollisionItem, DisambiguationCandidate } from '@/components/importacoes/wizard/SmartResolutionStrip';
import { useStores } from '@/hooks/useStores';
import { useStoreFileMappings } from '@/hooks/useStoreFileMappings';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { parseCentralImports } from '@/lib/parsers/centralImportManager';
import { generateDeterministicHash } from '@/lib/parsers/hashUtils';

export interface Fase2RedeVsOsReviewProps {
  targetDate: string;
  onAdvance: () => void;
  onBack: () => void;
  className?: string;
}

interface PosTransactionItem {
  id: string;
  store_id: string;
  store_name?: string;
  net_amount: number;
  gross_amount: number;
  fee_amount: number;
  payment_method: string;
  machine_name?: string;
  occurred_at?: string;
  matched_os_number?: string | null;
}

export function Fase2RedeVsOsReview({
  targetDate,
  onAdvance,
  onBack,
  className = ''
}: Fase2RedeVsOsReviewProps) {
  const { data: stores = [] } = useStores();
  const { mapping } = useStoreFileMappings(stores);

  const [isLoading, setIsLoading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [posList, setPosList] = useState<PosTransactionItem[]>([]);
  const [matchStats, setMatchStats] = useState<{
    matchedCount: number;
    collisionCount: number;
    totals: { rede_bruto: number; rede_liquido: number; rede_taxas: number };
  }>({
    matchedCount: 0,
    collisionCount: 0,
    totals: { rede_bruto: 0, rede_liquido: 0, rede_taxas: 0 }
  });

  const [collisions, setCollisions] = useState<ValueCollisionItem[]>([]);
  const [activeCollisionIndex, setActiveCollisionIndex] = useState(0);

  // 1. Carregar transações POS da data e rodar match
  const loadAndMatchRede = useCallback(async () => {
    if (!targetDate) return;
    setIsLoading(true);

    try {
      // 1. Executar RPC match_stage2_rede_os
      const { data: matchResult, error: matchErr } = await (supabase as any).rpc('match_stage2_rede_os', {
        p_target_date: targetDate
      });

      if (matchErr) throw matchErr;

      if (matchResult) {
        setMatchStats({
          matchedCount: matchResult.matched_count || 0,
          collisionCount: matchResult.collisions_count || 0,
          totals: matchResult.totals || { rede_bruto: 0, rede_liquido: 0, rede_taxas: 0 }
        });

        // Mapeia colisões para a SmartResolutionStrip
        if (matchResult.collisions && matchResult.collisions.length > 0) {
          const mappedCollisions: ValueCollisionItem[] = matchResult.collisions.map((c: any) => {
            const storeObj = stores.find(s => s.id === c.store_id);
            return {
              id: c.pos_id,
              amount: Number(c.net_amount || 0),
              storeId: c.store_id,
              storeName: storeObj?.name || c.store_id,
              counterpartName: c.payment_method,
              candidates: (c.candidates || []).map((cand: any) => ({
                id: cand.id,
                osNumber: cand.os_number,
                clientName: cand.client_name,
                totalValue: Number(cand.total_value || 0),
                paidValue: Number(cand.total_value - cand.pending_value || 0),
                openBalance: Number(cand.pending_value || 0)
              }))
            };
          });
          setCollisions(mappedCollisions);
        } else {
          setCollisions([]);
        }
      }

      // 2. Buscar todas as transações POS da data
      const { data: posData, error: posErr } = await supabase
        .from('pos_transactions')
        .select('*')
        .eq('target_date', targetDate)
        .order('net_amount', { ascending: false });

      if (!posErr && posData) {
        setPosList(posData.map((p: any) => {
          const storeObj = stores.find(s => s.id === p.store_id);
          return {
            id: p.id,
            store_id: p.store_id,
            store_name: storeObj?.name || p.store_id,
            net_amount: Number(p.net_amount || 0),
            gross_amount: Number(p.gross_amount || 0),
            fee_amount: Number(p.fee_amount || 0),
            payment_method: p.payment_method || 'Cartão',
            machine_name: p.machine_name,
            occurred_at: p.occurred_at,
            matched_os_number: p.matched_os_number
          };
        }));
      }
    } catch (err: any) {
      console.error('Erro ao processar Rede:', err);
      toast.error(`Falha no batimento de cartões: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [targetDate, stores]);

  useEffect(() => {
    loadAndMatchRede();
  }, [loadAndMatchRede]);

  // 2. Dropzone exclusiva para relatórios da Rede
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsLoading(true);

    try {
      const parseResult = await parseCentralImports(acceptedFiles);
      const redeResults = (parseResult?.redeResults || []).filter(r => r.success);

      if (redeResults.length === 0) {
        toast.warning('Nenhum arquivo válido da Adquirente Rede foi identificado.');
        setIsLoading(false);
        return;
      }

      const txsMap = new Map<string, any>();

      for (const r of redeResults) {
        r.transactions.forEach((t, idx) => {
          let storeId = mapping[t.storeName];
          if (storeId === 'GLOBAL') storeId = null as any;
          const storeObj = stores.find(s => s.id === storeId || s.name === t.storeName);
          const resolvedStoreId = storeId || storeObj?.id || null;

          const baseDate = t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : targetDate;

          let occurredAt: string;
          if (t.time && /^\d{1,2}:\d{2}(:\d{2})?$/.test(t.time.trim())) {
            const parts = t.time.trim().split(':');
            const hh = parts[0].padStart(2, '0');
            const mm = parts[1].padStart(2, '0');
            const ss = (parts[2] || '00').padStart(2, '0');
            occurredAt = `${baseDate}T${hh}:${mm}:${ss}Z`;
          } else {
            occurredAt = `${baseDate}T12:00:00Z`;
          }

          const uniqueEntropy = t.nsu
            ? `nsu_${t.nsu}${t.authorization ? `_auth_${t.authorization}` : ''}`
            : (t.authorization
                ? `auth_${t.authorization}${t.tid ? `_tid_${t.tid}` : ''}`
                : (t.tid
                    ? `tid_${t.tid}`
                    : `${t.method || 'rede'}_${t.time || ''}_${idx}`));

          const dedupHash = generateDeterministicHash(
            baseDate,
            t.netAmount || 0,
            `${resolvedStoreId || 'global'}_${uniqueEntropy}`,
            'pos'
          );

          const payload = {
            id: crypto.randomUUID(),
            store_id: resolvedStoreId,
            target_date: targetDate,
            gross_amount: Math.abs(t.grossAmount || t.netAmount || 0),
            net_amount: Math.abs(t.netAmount || 0),
            fee_amount: Math.abs(t.interest || (t as any).feeAmount || 0),
            payment_method: t.method || 'Cartão Crédito/Débito',
            machine_name: t.storeName || 'Rede',
            settlement_status: 'a_compensar',
            occurred_at: occurredAt,
            dedup_hash: dedupHash,
            transaction_type: t.transactionType === 'devolucao' ? 'devolucao' : 'venda'
          };

          const mapKey = `${resolvedStoreId || 'null'}_${dedupHash}`;
          txsMap.set(mapKey, payload);
        });
      }

      const txsToInsert = Array.from(txsMap.values());

      if (txsToInsert.length > 0) {
        const { error: insErr } = await supabase
          .from('pos_transactions')
          .upsert(txsToInsert, { onConflict: 'store_id, dedup_hash', ignoreDuplicates: true });
        if (insErr) throw insErr;
        toast.success(`${txsToInsert.length} vendas da Rede importadas com sucesso!`);
      }

      await loadAndMatchRede();
    } catch (err: any) {
      console.error('Erro ao importar Rede:', err);
      toast.error(`Falha na importação da Rede: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [mapping, stores, targetDate, loadAndMatchRede]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    }
  });

  // 3. Resolver colisão de valor via SmartResolutionStrip
  const handleResolveCollision = async (collisionId: string, chosenCandidate: DisambiguationCandidate) => {
    try {
      const { error: updErr } = await supabase
        .from('pos_transactions')
        .update({
          matched_os_number: chosenCandidate.osNumber,
          settlement_status: 'entrou'
        })
        .eq('id', collisionId);

      if (updErr) throw updErr;

      // Abate valor na OS
      const { data: posItem } = await supabase
        .from('pos_transactions')
        .select('net_amount, store_id')
        .eq('id', collisionId)
        .single();

      if (posItem) {
        await supabase
          .from('patio_os')
          .update({
            paid_value: chosenCandidate.paidValue + Number(posItem.net_amount),
            match_status: 'MATCHED'
          })
          .eq('id', chosenCandidate.id);
      }

      toast.success(`Transação vinculada com sucesso à OS #${chosenCandidate.osNumber}!`);

      // Remove colisão da fila
      setCollisions(prev => prev.filter(c => c.id !== collisionId));
      await loadAndMatchRede();
    } catch (err: any) {
      console.error('Erro ao resolver colisão:', err);
      toast.error(`Falha ao vincular: ${err.message}`);
    }
  };

  const handleDismissCollision = (collisionId: string) => {
    setCollisions(prev => prev.filter(c => c.id !== collisionId));
  };

  // Separação de vendas casadas vs resíduos (sobras de cartão sem OS)
  const matchedList = useMemo(() => posList.filter(p => !!p.matched_os_number), [posList]);
  const unmatchedList = useMemo(() => posList.filter(p => !p.matched_os_number), [posList]);

  const formatBrl = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* CABEÇALHO DA ETAPA 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
              FASE 2 DE 4
            </span>
            <h2 className="text-xl font-bold text-zinc-100">
              Vendas Rede (Maquininhas x Balcão)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Cruze as vendas capturadas nas maquininhas diretamente com as OSs da Fase 1, sem envolver extrato bancário.
          </p>
        </div>

        {/* Totalizadores da Fase 2 */}
        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-mono">
          <div>
            <span className="text-zinc-500 block text-[10px]">BRUTO REDE</span>
            <span className="text-zinc-200 font-bold">{formatBrl(matchStats.totals.rede_bruto)}</span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block text-[10px]">TAXAS MDR</span>
            <span className="text-rose-400 font-bold">{formatBrl(matchStats.totals.rede_taxas)}</span>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <span className="text-zinc-500 block text-[10px]">LÍQUIDO REDE</span>
            <span className="text-emerald-400 font-bold">{formatBrl(matchStats.totals.rede_liquido)}</span>
          </div>
        </div>
      </div>

      {/* DROPZONE EXCLUSIVA DE REDE */}
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
          {isDragActive ? 'Solte o relatório da Rede aqui' : 'Arraste o relatório de vendas da Adquirente Rede (.xlsx, .csv)'}
        </h4>
        <p className="text-zinc-400 text-xs text-center mt-0.5">
          O motor executa pré-matching determinístico imediato com as OSs de balcão já registradas.
        </p>
      </div>

      {/* FAIXA DE RESOLUÇÃO DE COLISÃO DE VALORES (SE HOUVER) */}
      {collisions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <AlertTriangle size={15} />
            <span>Colisões Detectadas ({collisions.length}): Valores idênticos em múltiplas OSs. Pressione 1 ou 2 para escolher:</span>
          </div>
          <SmartResolutionStrip
            collision={collisions[0]}
            totalPending={collisions.length}
            currentIndex={1}
            onResolve={handleResolveCollision}
            onDismiss={handleDismissCollision}
          />
        </div>
      )}

      {/* LISTAGEM DE CONFERÊNCIA: CASADAS VS SOBRAS */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" text="Processando batimento de cartões da Rede..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUNA 1: VENDAS CASADAS COM OS */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <h4 className="text-sm font-bold text-zinc-200">
                    Vendas Casadas com OS ({matchedList.length})
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatBrl(matchedList.reduce((a, b) => a + b.net_amount, 0))}
                </span>
              </div>

              {matchedList.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Nenhuma venda casada com OS ainda.
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {matchedList.map(pos => (
                    <div 
                      key={pos.id}
                      className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-200">{pos.store_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold">
                            OS #{pos.matched_os_number}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400">{pos.payment_method}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 block">{formatBrl(pos.net_amount)}</span>
                        <span className="text-[10px] text-zinc-500">Bruto: {formatBrl(pos.gross_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* COLUNA 2: SOBRAS DE CARTÃO (SEM OS NO BALCÃO) */}
          <Card className="p-4 bg-zinc-900/60 border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <h4 className="text-sm font-bold text-zinc-200">
                    Sobras da Rede sem OS ({unmatchedList.length})
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {formatBrl(unmatchedList.reduce((a, b) => a + b.net_amount, 0))}
                </span>
              </div>

              {unmatchedList.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Zero sobras! Todas as vendas de cartão foram vinculadas a OSs de balcão.
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {unmatchedList.map(pos => (
                    <div 
                      key={pos.id}
                      className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-200">{pos.store_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold">
                            Pendente Vínculo
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-400">{pos.payment_method}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-300 block">{formatBrl(pos.net_amount)}</span>
                        <span className="text-[10px] text-zinc-500">Taxa: {formatBrl(pos.fee_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
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
          Voltar para Fase 1: OSs
        </Button>

        <Button
          type="button"
          onClick={async () => {
            // Salva progresso da etapa na sessão
            await (supabase as any).rpc('save_pipeline_step_progress', {
              p_target_date: targetDate,
              p_step: 2,
              p_step_name: 'stage_2_rede',
              p_step_data: { matched: matchedList.length, unmatched: unmatchedList.length },
              p_mark_completed: true,
              p_selected_mode: 'manual'
            });
            onAdvance();
          }}
          className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 rounded-xl transition-all shadow-md shadow-emerald-950/40"
        >
          Avançar para Fase 3: Extratos OFX
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
