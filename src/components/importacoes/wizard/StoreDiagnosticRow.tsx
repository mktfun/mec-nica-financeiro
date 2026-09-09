import React from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  CreditCard, 
  ExternalLink,
  Zap,
  ArrowRight,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { CockpitStoreDetail, CockpitBrandDetail, SettlementStatusType } from '@/types/cockpit360';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface StoreDiagnosticRowProps {
  store: CockpitStoreDetail;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenStoreModal?: (storeId: string) => void;
  onQuickSettlePosFee?: (store: CockpitStoreDetail, feeAmount: number) => void;
}

export function getBrandBadgeStyle(brand: string) {
  const b = (brand || '').toLowerCase();
  if (b.includes('visa')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  if (b.includes('master')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
  if (b.includes('elo')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  if (b.includes('hiper')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  if (b.includes('pix')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
}

export function StoreDiagnosticRow({
  store,
  isExpanded,
  onToggleExpand,
  onOpenStoreModal,
  onQuickSettlePosFee
}: StoreDiagnosticRowProps) {
  const hasNaoEntrou = store.nao_entrou_valor > 0 || store.a_compensar_valor > 0;
  const isDivergent = store.status_compensacao === 'divergente' || store.divergencia_valor > 1.00;

  // Aluguel POS detectado
  const diffRedeOfx = Math.abs(store.rede_liquido - store.ofx_maquininhas);
  const isPosFeeCandidate = (
    (diffRedeOfx >= 118.5 && diffRedeOfx <= 120.5) ||
    (diffRedeOfx >= 238.0 && diffRedeOfx <= 241.0) ||
    (diffRedeOfx >= 357.0 && diffRedeOfx <= 360.0)
  );

  return (
    <>
      {/* Linha Principal da Tabela */}
      <tr 
        onClick={onToggleExpand}
        className={`cursor-pointer transition-colors border-b border-zinc-800/60 font-mono ${
          isExpanded 
            ? 'bg-zinc-800/40' 
            : isDivergent 
            ? 'bg-rose-950/10 hover:bg-rose-950/20' 
            : 'hover:bg-zinc-900/60'
        }`}
      >
        {/* Coluna 1: Loja e Indicador de Expansão */}
        <td className="py-3 px-4 font-sans">
          <div className="flex items-center gap-2.5">
            <button 
              type="button"
              className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded transition-transform duration-200"
              aria-label={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? <ChevronDown size={16} className="text-blue-400" /> : <ChevronRight size={16} />}
            </button>
            <div>
              <span className="font-semibold text-zinc-100 text-sm block">
                {store.store_name}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {store.total_transacoes} vendas • {store.transacoes_com_os} com OS
                {store.transacoes_sem_os > 0 && (
                  <span className="text-amber-400 font-semibold ml-1">
                    ({store.transacoes_sem_os} sem OS)
                  </span>
                )}
              </span>
            </div>
          </div>
        </td>

        {/* Coluna 2: Venda Rede Líquida */}
        <td className="py-3 px-4 text-right">
          <span className="text-zinc-200 font-bold text-sm block">
            {formatCurrency(store.rede_liquido)}
          </span>
          <span className="text-[10px] text-zinc-500 font-normal block font-mono">
            Bruto: {formatCurrency(store.rede_bruto)}
          </span>
        </td>

        {/* Coluna 3: Creditado no OFX */}
        <td className="py-3 px-4 text-right">
          <span className="text-emerald-400 font-bold text-sm block">
            {formatCurrency(store.ofx_maquininhas)}
          </span>
          <span className="text-[10px] text-zinc-500 font-normal block">
            {store.ofx_transacoes && store.ofx_transacoes.length > 0 
              ? `${store.ofx_transacoes.length} ${store.ofx_transacoes.length === 1 ? 'depósito' : 'depósitos'}`
              : 'Sem depósito'}
          </span>
        </td>

        {/* Coluna 4: Não Entrou / A Compensar */}
        <td className="py-3 px-4 text-right">
          {store.a_compensar_valor > 0 || store.nao_entrou_valor > 0 ? (
            <div>
              <span className="text-amber-400 font-bold text-sm block">
                {formatCurrency(store.a_compensar_valor || store.nao_entrou_valor)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-amber-500/80 font-semibold block">
                A Compensar
              </span>
            </div>
          ) : (
            <span className="text-zinc-600 font-normal text-xs">R$ 0,00</span>
          )}
        </td>

        {/* Coluna 5: Micro-chips de Bandeiras */}
        <td className="py-3 px-4">
          <div className="flex flex-wrap gap-1 items-center max-w-[280px]">
            {store.brands && store.brands.length > 0 ? (
              store.brands.map((b, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${getBrandBadgeStyle(b.brand)}`}
                  title={`${b.brand}: Líquido ${formatCurrency(b.liquido)} (${b.tx_count} vendas) - Status: ${b.status}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    b.status === 'entrou' ? 'bg-emerald-400' :
                    b.status === 'a_compensar' ? 'bg-amber-400' :
                    b.status === 'parcial' ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  <span className="font-semibold">{b.brand}</span>
                  <span className="text-[9px] opacity-80">{formatCurrency(b.liquido)}</span>
                </span>
              ))
            ) : (
              <span className="text-zinc-600 text-xs italic font-sans">Sem movimento</span>
            )}
          </div>
        </td>

        {/* Coluna 6: Status Semântico */}
        <td className="py-3 px-4 text-center">
          {store.status_compensacao === 'entrou' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-sans">
              <CheckCircle2 size={13} /> ENTROU
            </span>
          )}
          {store.status_compensacao === 'a_compensar' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 font-sans">
              <Clock size={13} /> A COMPENSAR
            </span>
          )}
          {store.status_compensacao === 'parcial' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 font-sans">
              <Clock size={13} /> PARCIAL
            </span>
          )}
          {store.status_compensacao === 'divergente' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 font-sans">
              <AlertTriangle size={13} /> DIVERGENTE
            </span>
          )}
          {store.status_compensacao === 'nao_entrou' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 font-sans">
              <AlertTriangle size={13} /> NÃO ENTROU
            </span>
          )}
          {store.status_compensacao === 'sem_movimento' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800 font-sans">
              SEM MOVIMENTO
            </span>
          )}
        </td>

        {/* Coluna 7: Ação */}
        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenStoreModal?.(store.store_id)}
            className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7 px-2.5 rounded-lg flex items-center gap-1"
          >
            Auditar
            <ExternalLink size={12} />
          </Button>
        </td>
      </tr>

      {/* Linha do Accordion Inline Expansível */}
      {isExpanded && (
        <tr className="bg-zinc-950/80 border-b border-zinc-800/80">
          <td colSpan={7} className="p-4 pl-10">
            <div className="space-y-4">
              
              {/* Alerta de Ação Rápida de Aluguel POS */}
              {isPosFeeCandidate && (
                <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Zap size={18} className="text-amber-400 shrink-0" />
                    <div className="text-xs font-sans">
                      <span className="font-semibold text-zinc-100">Retenção de Aluguel de Maquininha detectada:</span>{' '}
                      <span className="text-zinc-300">
                        O depósito OFX foi menor em <strong className="text-rose-300 font-mono">{formatCurrency(diffRedeOfx)}</strong>.
                        Você pode dar baixa no lote e lançar essa diferença como tarifa POS automaticamente.
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onQuickSettlePosFee?.(store, diffRedeOfx)}
                    className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1 px-3 h-auto rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <Zap size={13} className="text-amber-300" />
                    ⚡ Baixar & Lançar Tarifa ({formatCurrency(diffRedeOfx)})
                  </Button>
                </div>
              )}

              {/* Grid das Bandeiras da Filial */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                  <CreditCard size={13} className="text-blue-400" />
                  Detalhamento por Bandeira da Maquininha (Rede)
                </h4>
                
                {store.brands && store.brands.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {store.brands.map((brand, bIdx) => (
                      <div 
                        key={bIdx}
                        className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getBrandBadgeStyle(brand.brand)}`}>
                            {brand.brand}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {brand.tx_count} {brand.tx_count === 1 ? 'tx' : 'txs'}
                          </span>
                        </div>
                        
                        <div className="space-y-1 font-mono text-xs my-1.5">
                          <div className="flex justify-between text-zinc-300">
                            <span className="text-zinc-500 text-[10px]">Líquido:</span>
                            <span className="font-bold text-zinc-100">{formatCurrency(brand.liquido)}</span>
                          </div>
                          <div className="flex justify-between text-zinc-400 text-[11px]">
                            <span className="text-zinc-500 text-[10px]">Bruto:</span>
                            <span>{formatCurrency(brand.bruto)}</span>
                          </div>
                          <div className="flex justify-between text-rose-400/90 text-[10px]">
                            <span className="text-zinc-500">MDR:</span>
                            <span>-{formatCurrency(brand.taxas)} ({brand.taxa_efetiva_pct?.toFixed(2) || '0'}%)</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between text-[10px]">
                          <span className="text-zinc-500">Compensação:</span>
                          <span className={`font-semibold capitalize ${
                            brand.status === 'entrou' ? 'text-emerald-400' :
                            brand.status === 'a_compensar' ? 'text-amber-400' :
                            brand.status === 'parcial' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {brand.status === 'a_compensar' ? 'A Compensar' : brand.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Nenhuma venda registrada na maquininha para esta filial hoje.</p>
                )}
              </div>

              {/* Depósitos do OFX Vinculados */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                  <Building2 size={13} className="text-emerald-400" />
                  Créditos de Cartão Detectados no Extrato Bancário (OFX Itaú)
                </h4>
                {store.ofx_transacoes && store.ofx_transacoes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {store.ofx_transacoes.map((tx, idx) => (
                      <div 
                        key={idx}
                        className="bg-zinc-900 border border-emerald-900/30 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-mono"
                      >
                        <span className="text-emerald-400 font-bold">{formatCurrency(tx.amount)}</span>
                        <span className="text-zinc-400 text-[11px] font-sans truncate max-w-[220px]" title={tx.counterpart}>
                          {tx.counterpart || 'Crédito Rede'}
                        </span>
                        {tx.fitid && (
                          <span className="text-[9px] text-zinc-500 px-1 py-0.5 bg-zinc-800 rounded" title={`FITID: ${tx.fitid}`}>
                            FITID: {tx.fitid.slice(-6)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-500 italic">
                    Nenhum crédito de adquirente encontrado no extrato Itaú desta filial para a data de hoje.
                    O valor líquido das vendas permanece em <span className="text-amber-400 font-medium">A COMPENSAR</span> no Saldo do Pilar 1 até o crédito no próximo dia útil.
                  </div>
                )}
              </div>

            </div>
          </td>
        </tr>
      )}
    </>
  );
}
