import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ExternalLink, 
  CreditCard, 
  Percent, 
  Landmark, 
  ArrowRight,
  Link2,
  FileEdit,
  Unlink
} from 'lucide-react';
import { usePosTripleReconciliation } from '@/hooks/useBackendConciliacao';
import { useManualMatch } from '@/hooks/useManualMatch';
import { useCategorizeOrphan } from '@/hooks/useCategorizeOrphan';
import { ManualMatchOsModal } from './ManualMatchOsModal';
import { OrphanCategorizationModal } from './OrphanCategorizationModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OsDetailModal } from './OsDetailModal';
import { formatCurrency } from '@/lib/utils';
import { AmountCell } from '@/components/finance/AmountCell';
import { toast } from 'sonner';

interface StoreCartaoMaquininhaViewProps {
  storeId: string;
  date: string;
}

export function StoreCartaoMaquininhaView({ storeId, date }: StoreCartaoMaquininhaViewProps) {
  const queryClient = useQueryClient();
  const { data: tripleReconData } = usePosTripleReconciliation(date);
  const { unlinkTransaction } = useManualMatch();
  const { categorize } = useCategorizeOrphan();

  const [selectedOsData, setSelectedOsData] = useState<any | null>(null);
  const [matchingPos, setMatchingPos] = useState<any | null>(null);
  const [categorizingPos, setCategorizingPos] = useState<any | null>(null);
  const [isUnlinkingId, setIsUnlinkingId] = useState<string | null>(null);

  // Consulta direta na tabela pos_transactions para a filial e data
  const { data: posRows = [], isLoading } = useQuery({
    queryKey: ['store_pos_transactions', storeId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pos_transactions')
        .select('*')
        .eq('store_id', storeId)
        .or(`target_date.eq.${date},occurred_at.gte.${date}T00:00:00,occurred_at.lte.${date}T23:59:59`)
        .order('occurred_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar pos_transactions:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!storeId && !!date,
  });

  // Busca OSs do pátio para enriquecimento das informações de cliente e veículo
  const { data: patioOsList = [] } = useQuery({
    queryKey: ['patio_os_for_store', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patio_os')
        .select('id, os_number, client_name, plate, total_value, paid_value, status, payment_method, credit_value, debit_value')
        .eq('store_id', storeId);
      if (error) {
        console.warn('Aviso ao buscar patio_os:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!storeId,
    staleTime: 1000 * 60,
  });

  const rows = useMemo(() => {
    return posRows.map((pos: any) => {
      const rawOsNum = pos.matched_os_number;
      let osData: any = null;
      if (rawOsNum) {
        osData = patioOsList.find((o: any) => String(o.os_number) === String(rawOsNum)) || null;
      }

      const gross = Number(pos.gross_amount || 0);
      const fee = Number(pos.fee_amount || 0);
      const net = Number(pos.net_amount || (gross - fee));
      const feePercent = gross > 0 ? (fee / gross) * 100 : 0;

      const pmStr = String(pos.payment_method || pos.machine_name || 'Cartão');
      let brand = 'Rede';
      const pmLower = pmStr.toLowerCase();
      if (pmLower.includes('visa')) brand = 'Visa';
      else if (pmLower.includes('mast')) brand = 'Mastercard';
      else if (pmLower.includes('elo')) brand = 'Elo';
      else if (pmLower.includes('hiper')) brand = 'Hipercard';
      else if (pmLower.includes('amex')) brand = 'Amex';
      else if (pmLower.includes('pix')) brand = 'PIX';

      const isSettledInBank = pos.settlement_status === 'entrou';

      return {
        id: pos.id,
        bandeira: brand,
        payment_method: pmStr,
        rede_bruto: gross,
        taxa_brl: fee,
        taxa_percent: feePercent,
        rede_liquido: net,
        os_number: rawOsNum ? `OS #${rawOsNum}` : 'Lote REDE Consolidado',
        has_os: !!rawOsNum,
        raw_os_number: rawOsNum,
        os_data: osData ? {
          ...osData,
          client_name: osData.client_name || '',
          vehicle: osData.plate || '',
        } : null,
        manual_category: pos.manual_category || null,
        manual_justification: pos.manual_justification || null,
        occurred_at: pos.occurred_at,
        settlement_status: pos.settlement_status,
        is_settled: isSettledInBank,
      };
    });
  }, [posRows, patioOsList]);

  const handleOpenMatch = (row: any) => {
    setMatchingPos({
      id: row.id,
      title: `${row.bandeira} - ${row.payment_method}`,
      counterpart_name: row.bandeira,
      amount: row.rede_bruto,
      occurred_at: row.occurred_at || date,
      store_id: storeId,
      source: 'rede',
      payment_method: row.payment_method
    });
  };

  const handleOpenCategorize = (row: any) => {
    setCategorizingPos({
      id: row.id,
      title: `Cartão ${row.bandeira} - ${row.payment_method}`,
      amount: row.rede_bruto,
      type: 'in'
    });
  };

  const handleUnlink = async (posId: string, osNumber: string) => {
    try {
      setIsUnlinkingId(posId);
      const res = await unlinkTransaction(posId, osNumber, 'rede');
      if (res.success) {
        toast.success(`Vínculo da venda de cartão com a OS #${osNumber} desfeito com sucesso!`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['store_pos_transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['patio_os_for_store'] }),
          queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
          queryClient.invalidateQueries({ queryKey: ['triple-reconciliation'] }),
          queryClient.invalidateQueries({ queryKey: ['pos_triple_reconciliation'] })
        ]);
      } else {
        toast.error(`Falha ao desvincular: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao desvincular: ${err.message || err}`);
    } finally {
      setIsUnlinkingId(null);
    }
  };

  const handleCategorizationSuccess = async () => {
    toast.success('Baixa / Justificativa salva com sucesso!');
    setCategorizingPos(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['store_pos_transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
      queryClient.invalidateQueries({ queryKey: ['daily_revenue_adjustments'] }),
      queryClient.invalidateQueries({ queryKey: ['triple-reconciliation'] }),
      queryClient.invalidateQueries({ queryKey: ['pos_triple_reconciliation'] })
    ]);
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner text="Carregando conciliação de cartões..." /></div>;
  }

  const storePos = tripleReconData?.stores?.find((s: any) => s.store_id === storeId);

  const totalRedeBruto = rows.reduce((acc: number, r: any) => acc + Number(r.rede_bruto || 0), 0);
  const totalTaxas = rows.reduce((acc: number, r: any) => acc + Number(r.taxa_brl || 0), 0);
  const totalRedeLiquido = rows.reduce((acc: number, r: any) => acc + Number(r.rede_liquido || 0), 0);
  const totalCreditadoBanco = storePos?.ofx_maquininhas ?? 0;
  const valorACompensar = storePos?.nao_entrou_valor ?? rows.filter((r: any) => !r.is_settled).reduce((acc: number, r: any) => acc + r.rede_liquido, 0);
  const isSettled = totalCreditadoBanco > 0 && (storePos?.status_compensacao === 'entrou' || totalCreditadoBanco >= totalRedeLiquido);

  const getBrandBadgeColor = (brand: string) => {
    const b = (brand || '').toLowerCase();
    if (b.includes('visa')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (b.includes('master')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (b.includes('elo')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (b.includes('hiper')) return 'bg-red-500/10 text-red-400 border-red-500/30';
    if (b.includes('pix')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
  };

  return (
    <div className="space-y-6">
      {/* 4 Summary Cards Canônicos (border-l-4) — Padrão Pátio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Bruto */}
        <Card className="border-l-4 border-l-[var(--color-primary)]">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Total Cartão (Bruto)</p>
          <p className="font-display font-bold text-2xl text-[var(--text-primary)] font-mono">
            <AmountCell value={totalRedeBruto} tone="neutral" />
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">Vendas passadas na maquininha</span>
        </Card>

        {/* Card 2: Taxas MDR */}
        <Card className="border-l-4 border-l-amber-500">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Taxas MDR Retidas</p>
          <p className="font-display font-bold text-2xl font-mono text-amber-400">
            - <AmountCell value={totalTaxas} tone="warning" />
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">
            Média efetiva: {totalRedeBruto > 0 ? ((totalTaxas / totalRedeBruto) * 100).toFixed(2) : '0,00'}%
          </span>
        </Card>

        {/* Card 3: Líquido Apurado */}
        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Líquido das Vendas</p>
          <p className="font-display font-bold text-2xl font-mono text-emerald-400">
            <AmountCell value={totalRedeLiquido} tone="success" />
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">Crédito calculado das vendas</span>
        </Card>

        {/* Card 4: Creditado no Banco */}
        <Card className="border-l-4 border-l-blue-500">
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Creditado no Extrato</p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display font-bold text-2xl font-mono text-blue-400">
              <AmountCell value={totalCreditadoBanco} tone="brand" />
            </p>
            {isSettled ? (
              <Badge variant="success" dot className="text-[10px]">
                ENTROU
              </Badge>
            ) : (
              <Badge variant="warning" dot className="text-[10px]">
                A COMPENSAR
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)] font-mono block mt-1">
            {valorACompensar > 0 ? `+ ${formatCurrency(valorACompensar)} a compensar` : 'Lote liquidado no banco'}
          </span>
        </Card>
      </div>

      {/* Tabela Unificada de Vendas por Cartão — Padrão Pátio */}
      <Card className="p-0 overflow-hidden border-[var(--border-subtle)]">
        <div className="bg-[var(--bg-surface-elevated)] p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base flex items-center gap-2 text-white">
              <CreditCard size={18} className="text-emerald-400" />
              1. Vendas em Cartão (Maquininha → Extrato Bancário)
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Conferência individual das vendas: bandeira, valor bruto, taxa MDR retida, OS vinculada e status no extrato bancário.
            </p>
          </div>
          <Badge variant="neutral" className="text-xs font-mono">
            {rows.length} transações
          </Badge>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center">
            <Info size={36} className="opacity-20 mb-3" />
            Nenhuma transação de cartão encontrada para esta data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-surface)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Bandeira / Modalidade</th>
                  <th className="text-right py-3 px-4 font-semibold">Valor Bruto</th>
                  <th className="text-right py-3 px-4 font-semibold">Taxa MDR Retida</th>
                  <th className="text-right py-3 px-4 font-semibold">Valor Líquido</th>
                  <th className="text-left py-3 px-4 font-semibold">Referência / OS</th>
                  <th className="text-center py-3 px-4 font-semibold">Status no Banco</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {rows.map((row: any, i: number) => {
                  const hasOs = !!row.os_data || (row.os_number && row.os_number !== 'Lote REDE Consolidado');

                  return (
                    <tr key={i} className="hover:bg-[var(--bg-surface-elevated)] transition-colors">
                      {/* Bandeira / Modalidade */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getBrandBadgeColor(row.bandeira)}`}>
                            {row.bandeira}
                          </span>
                          <span className="text-[var(--text-primary)] font-medium">{row.payment_method || 'Cartão'}</span>
                        </div>
                      </td>

                      {/* Bruto */}
                      <td className="py-3 px-4 text-right">
                        <AmountCell value={row.rede_bruto} tone="neutral" />
                      </td>

                      {/* Taxa MDR */}
                      <td className="py-3 px-4 text-right font-mono text-amber-400">
                        - <AmountCell value={row.taxa_brl} tone="warning" />
                        <span className="text-[10px] text-[var(--text-tertiary)] block">
                          ({row.taxa_percent?.toFixed(1)}%)
                        </span>
                      </td>

                      {/* Líquido */}
                      <td className="py-3 px-4 text-right">
                        <AmountCell value={row.rede_liquido} tone="success" className="font-bold" />
                      </td>

                      {/* OS Vinculada */}
                      <td className="py-3 px-4">
                        {hasOs ? (
                          <div className="flex items-center justify-between gap-2 max-w-[260px]">
                            <div className="flex flex-col min-w-0">
                              <button
                                onClick={() => setSelectedOsData(row.os_data || { os_number: row.os_number.replace('OS #', ''), total_value: row.rede_bruto, paid_value: row.rede_liquido, status: 'paga' })}
                                className="font-semibold text-blue-400 hover:underline flex items-center gap-1 text-left cursor-pointer truncate"
                              >
                                {row.os_number}
                                <ExternalLink size={11} />
                              </button>
                              {row.os_data && (
                                <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                                  {row.os_data.client_name || row.os_data.vehicle || ''}
                                </span>
                              )}
                            </div>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleUnlink(row.id, row.raw_os_number)}
                              disabled={isUnlinkingId === row.id}
                              title="Desvincular OS"
                              className="h-6 w-6 p-0 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
                            >
                              <Unlink size={11} />
                            </Button>
                          </div>
                        ) : row.manual_category ? (
                          <div className="flex items-center justify-between gap-2 max-w-[260px]">
                            <div className="flex flex-col min-w-0">
                              <Badge variant="brand" className="text-[10px] px-1.5 py-0.5 truncate w-fit">
                                {row.manual_category}
                              </Badge>
                              {row.manual_justification && (
                                <span className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5" title={row.manual_justification}>
                                  {row.manual_justification}
                                </span>
                              )}
                            </div>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleOpenCategorize(row)}
                              title="Editar Justificativa"
                              className="h-6 w-6 p-0 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 shrink-0"
                            >
                              <FileEdit size={11} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleOpenMatch(row)}
                              className="h-6 px-2 text-[10px] bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 gap-1 font-medium"
                              title="Vincular a uma OS em aberto ou cadastrar nova OS"
                            >
                              <Link2 size={11} />
                              Vincular OS
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleOpenCategorize(row)}
                              className="h-6 px-2 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 gap-1 font-medium"
                              title="Dar baixa avulsa (Venda Balcão, Pendente, etc.)"
                            >
                              <FileEdit size={11} />
                              Dar Baixa
                            </Button>
                          </div>
                        )}
                      </td>

                      {/* Status no Banco */}
                      <td className="py-3 px-4 text-center">
                        {(totalCreditadoBanco > 0 && (row.is_settled || isSettled)) ? (
                          <Badge variant="success" dot className="text-[10px]">
                            LIQUIDADO NO BANCO
                          </Badge>
                        ) : (
                          <Badge variant="warning" dot className="text-[10px]">
                            A COMPENSAR
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Detalhes da OS */}
      {selectedOsData && (
        <OsDetailModal
          isOpen={!!selectedOsData}
          onClose={() => setSelectedOsData(null)}
          os={selectedOsData}
          storeId={storeId}
        />
      )}

      {/* Modal de Vínculo com OS */}
      {matchingPos && (
        <ManualMatchOsModal
          isOpen={!!matchingPos}
          onClose={() => setMatchingPos(null)}
          transaction={matchingPos}
          storeId={storeId}
          targetDate={date}
          onSuccess={async () => {
            setMatchingPos(null);
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['store_pos_transactions'] }),
              queryClient.invalidateQueries({ queryKey: ['patio_os_for_store'] }),
              queryClient.invalidateQueries({ queryKey: ['reconciliation_views'] }),
              queryClient.invalidateQueries({ queryKey: ['triple-reconciliation'] }),
              queryClient.invalidateQueries({ queryKey: ['pos_triple_reconciliation'] })
            ]);
          }}
        />
      )}

      {/* Modal de Justificativa / Baixa Avulsa */}
      {categorizingPos && (
        <OrphanCategorizationModal
          transactionId={categorizingPos.id}
          transactionTitle={categorizingPos.title || 'Venda em Cartão'}
          transactionAmount={Number(categorizingPos.amount || 0)}
          transactionType="in"
          storeId={storeId}
          targetDate={date}
          onClose={() => setCategorizingPos(null)}
          onSuccess={handleCategorizationSuccess}
          categorizeOrphan={(id, cat, just, impacts) =>
            categorize(id, cat, just, impacts, Number(categorizingPos.amount || 0), date, 'in', storeId)
          }
        />
      )}
    </div>
  );
}
