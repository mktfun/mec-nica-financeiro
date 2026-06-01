import { createFileRoute, Link } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { CheckCircle2, ArrowRight, TrendingUp, CreditCard, Car, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { useConciliacaoResumo, useConciliacaoDetalhes, useSaveDailyCash } from '@/hooks/useConciliacao';
import { useAlerts } from '@/hooks/useAlerts';
import { usePatioOS } from '@/hooks/usePatio';
import { getDefaultDate } from '@/lib/utils';

export const Route = createFileRoute('/conciliacao')({
  component: ConciliacaoPage,
});

function ConciliacaoPage() {
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: resumo, isLoading: loadingResumo } = useConciliacaoResumo();
  const { data: detalhes = [], isLoading: loadingDetalhes } = useConciliacaoDetalhes();
  const { data: alertas = [], isLoading: loadingAlertas } = useAlerts();
  const { data: patio = [], isLoading: loadingPatio } = usePatioOS();
  
  const { mutate: saveDailyCash } = useSaveDailyCash();
  
  const [cashValues, setCashValues] = useState<Record<string, string>>({});
  const [showAllStores, setShowAllStores] = useState(false);

  const isLoading = loadingStores || loadingResumo || loadingDetalhes || loadingAlertas || loadingPatio;

  const resultado = resumo?.totalDivergence || 0;
  const isApproved = resultado === 0 && (resumo?.approved || 0) > 0;
  
  const alertasCriticos = alertas.filter(a => a.severity !== 'info');
  const carrosNoPatio = patio.filter(p => p.status === 'em_aberto').length;
  
  // Use getDefaultDate to respect the D-1 standard
  const targetDateStr = getDefaultDate();
  const today = new Date(`${targetDateStr}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const handleSaveCash = () => {
    Object.entries(cashValues).forEach(([storeId, value]) => {
      const numValue = parseFloat(value.replace(',', '.'));
      if (!isNaN(numValue) && numValue > 0) {
        saveDailyCash({ storeId, value: numValue });
      }
    });
    alert('Valores de caixa atualizados com sucesso!');
  };

  return (
    <AppShell>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
        {/* Timestamp */}
        <p className="text-xs text-[var(--text-tertiary)]">Atualizado agora · Dados de {today}</p>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <svg className="animate-spin w-8 h-8 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : (
          <>
            {/* Status Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-[var(--radius-lg)] border flex items-center justify-between ${
                isApproved
                  ? 'bg-[var(--color-accent-teal)]/5 border-[var(--color-accent-teal)]/20'
                  : 'bg-[var(--color-accent-danger)]/5 border-[var(--color-accent-danger)]/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className={isApproved ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'} />
                <span className="font-medium text-sm">
                  {isApproved 
                    ? 'Conciliação do dia aprovada automaticamente' 
                    : 'Conciliação do dia com divergências'
                  } — Divergência Total: R$ {resultado.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <Link to="/conciliacao-detalhes" className="text-[var(--color-primary)] text-sm font-medium flex items-center gap-1 hover:underline">
                Ver detalhes <ArrowRight size={14} />
              </Link>
            </motion.div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Entradas do Dia</span>
                  <TrendingUp size={18} className="text-[var(--color-accent-teal)]" />
                </div>
                <div className="font-display text-2xl font-bold">
                  <AnimatedNumber value={resumo?.totalIn || 0} format="currency" />
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{resumo?.rows?.length || 0} lojas processadas</p>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Lojas Conciliadas</span>
                  <CheckCircle2 size={18} className="text-[var(--color-accent-success)]" />
                </div>
                <div className="font-display text-2xl font-bold">
                  {resumo?.approved || 0} <span className="text-base font-normal text-[var(--text-secondary)]">/ {stores.length}</span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">status OK</p>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Saldo Líquido</span>
                  <Receipt size={18} className="text-[var(--color-primary)]" />
                </div>
                <div className="font-display text-2xl font-bold">
                  <AnimatedNumber value={resumo?.resultado || 0} format="currency" />
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Soma de todas as lojas</p>
              </Card>

              <Link to="/patio">
                <Card className="relative overflow-hidden hover:border-[var(--border-strong)] transition-colors cursor-pointer h-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Carros no Pátio</span>
                    <Car size={18} className="text-[var(--color-accent-danger)]" />
                  </div>
                  <div className="font-display text-2xl font-bold">
                    {carrosNoPatio} <span className="text-base font-normal text-[var(--text-secondary)]">OS</span>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">em aberto</p>
                </Card>
              </Link>
            </div>

            {/* Lojas Grid */}
            <div>
              <h2 className="font-display font-semibold text-xl mb-2">{stores.length} Lojas</h2>
              <p className="text-sm text-[var(--text-tertiary)] mb-4">Status de conciliação por unidade — clique para ver detalhes</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {stores.map((store, i) => {
                  const rec = detalhes.find(d => d.store_id === store.id);
                  const status = rec?.status || 'pending';
                  const financialTotal = rec?.financial_total || 0;

                  return (
                    <motion.div
                      key={store.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link to="/lojas">
                        <Card
                          variant="glass"
                          className={`p-4 cursor-pointer hover:border-[var(--border-strong)] transition-colors ${
                            status === 'divergence' ? 'border-[var(--color-accent-danger)]/30' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm truncate">{store.name}</h3>
                            {status === 'approved' && <Badge variant="success" className="text-[10px]">✓ OK</Badge>}
                            {status === 'divergence' && <Badge variant="danger" className="text-[10px]">⚠ Divergência</Badge>}
                            {status === 'pending' && <Badge variant="warning" className="text-[10px]">• Pendente</Badge>}
                          </div>
                          <div className="mt-2 bg-white/5 rounded-md p-2 space-y-1.5 border border-white/5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[var(--text-secondary)]">Faturado:</span>
                              <span className="font-medium text-[var(--text-primary)]">
                                <AnimatedNumber value={financialTotal} format="currency" />
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-t border-white/5 pt-1.5">
                              <span className="text-[var(--text-secondary)]">Físico:</span>
                              <span className="font-medium text-[var(--text-primary)]">
                                <AnimatedNumber value={rec?.daily_cash || 0} format="currency" />
                              </span>
                            </div>
                          </div>
                          {status === 'divergence' && (
                            <p className="text-xs text-[var(--color-accent-danger)] mt-2 font-medium">
                              Falta R$ {Math.abs(rec?.divergence || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </p>
                          )}
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Alertas ativos + Dinheiro em Caixa side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alertas Ativos */}
              <Card variant="glass" className="p-6">
                <h3 className="font-display font-semibold mb-1">Alertas ativos</h3>
                <p className="text-xs text-[var(--text-tertiary)] mb-4">{alertasCriticos.length} ocorrências detectadas hoje</p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {alertasCriticos.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)]">Nenhum alerta crítico ativo.</p>
                  ) : (
                    alertasCriticos.map(alert => (
                      <div key={alert.id} className="flex items-start gap-3 text-sm border-b border-white/5 pb-3">
                        <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${alert.severity === 'critical' ? 'bg-[var(--color-accent-danger)]' : 'bg-[var(--color-accent-warning)]'}`} />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold">{alert.store_name}</span>{' '}
                          <span className="text-[var(--text-tertiary)]">{alert.os_number || ''}</span>
                          <p className="text-[var(--text-secondary)] text-xs mt-0.5">{alert.title} - {alert.description}</p>
                        </div>
                        <span className="text-xs text-[var(--text-tertiary)] shrink-0">{alert.time || new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    ))
                  )}
                </div>
                <Link to="/alertas" className="text-[var(--color-primary)] text-sm font-medium mt-4 inline-flex items-center gap-1 hover:underline">
                  Ver todos os alertas <ArrowRight size={14} />
                </Link>
              </Card>

              {/* Dinheiro em Caixa */}
              <Card variant="glass" className="p-6 flex flex-col h-full">
                <h3 className="font-display font-semibold mb-1">Dinheiro em Caixa · Hoje</h3>
                <p className="text-xs text-[var(--text-tertiary)] mb-4">Informe o valor físico contado por loja</p>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                  {(showAllStores ? stores : stores.slice(0, 4)).map(store => {
                    const rec = detalhes.find(d => d.store_id === store.id);
                    const savedCash = rec?.daily_cash || 0;

                    return (
                      <div key={store.id} className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-sm">{store.name}</span>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[var(--text-tertiary)]">R$</span>
                          <input
                            type="text"
                            placeholder={savedCash.toFixed(2).replace('.', ',')}
                            value={cashValues[store.id] || ''}
                            onChange={(e) => setCashValues(prev => ({ ...prev, [store.id]: e.target.value }))}
                            className="w-24 text-right bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--color-primary)]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {stores.length > 4 && !showAllStores && (
                  <button onClick={() => setShowAllStores(true)} className="text-[var(--color-primary)] text-sm font-medium mt-3 hover:underline text-left">
                    + Ver todas as lojas
                  </button>
                )}
                {showAllStores && (
                  <button onClick={() => setShowAllStores(false)} className="text-[var(--color-primary)] text-sm font-medium mt-3 hover:underline text-left">
                    - Ocultar lojas
                  </button>
                )}
                <div className="mt-4 pt-2">
                  <button 
                    onClick={handleSaveCash}
                    className="w-full py-3 bg-[var(--color-primary)] text-white rounded-[var(--radius-full)] font-medium text-sm hover:opacity-90 transition-opacity"
                  >
                    Salvar valores
                  </button>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
